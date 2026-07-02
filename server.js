const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const initDb = require('./db');

const app = express();

// Middleware to parse incoming JSON payloads
app.use(express.json());
// Serve static files from the 'public' folder 
app.use(express.static('public'));

let db; // Will hold active database connection

// ==========================================
// 1. AUTHENTICATION MIDDLEWARE ("The Bouncer")
// ==========================================
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the token using the secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach the decoded payload (userId, orgId, role) to the request
        req.user = decoded; 
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Expired or invalid token' });
    }
};

// ==========================================
// 2. THE DUAL-PATH LOGIN CONTROLLER
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    // Path A: The Super Admin Bypass
    if (email === process.env.SUPER_ADMIN_EMAIL && password === process.env.SUPER_ADMIN_PASS) {
        const token = jwt.sign({ role: 'SUPER_ADMIN' }, process.env.JWT_SECRET, { expiresIn: '8h' });
        return res.json({ token, role: 'SUPER_ADMIN' });
    }

    // Path B: The Tenant Path
    try {
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Bakes the organization ID directly into the token payload
        const token = jwt.sign(
            { userId: user.id, orgId: user.organization_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, role: user.role, orgId: user.organization_id });
    } catch (error) {
        console.error("LOGIN CRASH:", error); 
        res.status(500).json({ error: 'Internal server error' });
    }
});

// A test route to verify the middleware works
app.get('/api/protected-route-test', requireAuth, (req, res) => {
    res.json({ 
        message: "You made it through the bouncer!", 
        your_identity: req.user 
    });
});

// ==========================================
// 3. ORG ADMIN ROUTES (Protected API)
// ==========================================

// Read: Get all flags for the logged-in organization
app.get('/api/flags', requireAuth, async (req, res) => {
    try {
        const flags = await db.all(
            'SELECT * FROM feature_flags WHERE organization_id = ?',
            [req.user.orgId] // The Bouncer provides this!
        );
        res.json(flags);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch flags' });
    }
});

// Create: Make a new feature flag (Defaults to OFF)
app.post('/api/flags', requireAuth, async (req, res) => {
    const { feature_key } = req.body;
    try {
        const result = await db.run(
            'INSERT INTO feature_flags (organization_id, feature_key) VALUES (?, ?)',
            [req.user.orgId, feature_key]
        );
        res.json({ id: result.lastID, feature_key, is_enabled: 0 });
    } catch (error) {
        // SQLite will reject this if the UNIQUE(orgId, feature_key) constraint is violated
        res.status(400).json({ error: 'Flag creation failed. Does it already exist?' });
    }
});

// Update: Toggle a flag On or Off
app.patch('/api/flags/:id', requireAuth, async (req, res) => {
    const { is_enabled } = req.body;
    const flagId = req.params.id;

    try {
        // THE TENANT GUARD: We enforce organization_id in the WHERE clause.
        // Tenant A literally cannot update this row if it belongs to Tenant B.
        const result = await db.run(
            'UPDATE feature_flags SET is_enabled = ? WHERE id = ? AND organization_id = ?',
            [is_enabled ? 1 : 0, flagId, req.user.orgId]
        );

        if (result.changes === 0) {
            return res.status(403).json({ error: 'Forbidden: Flag not found or belongs to another tenant' });
        }
        res.json({ success: true, is_enabled });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update flag' });
    }
});

// ==========================================
// 4. END USER ROUTE (The Public SDK Check)
// ==========================================
// This is the endpoint the end-user's browser pings to check if a feature is on.
// It is NOT protected by JWT, because end-users don't log into the dashboard.
app.post('/api/sdk/check', async (req, res) => {
    const { org_name, feature_key } = req.body;

    try {
        // Join tables to find the flag using the organization's string name
        const flag = await db.get(`
            SELECT f.is_enabled 
            FROM feature_flags f
            JOIN organizations o ON f.organization_id = o.id
            WHERE o.name = ? AND f.feature_key = ?
        `, [org_name, feature_key]);

        if (!flag) {
            return res.json({ enabled: false }); // Failsafe: If flag doesn't exist, keep feature hidden
        }
        
        res.json({ enabled: !!flag.is_enabled });
    } catch (error) {
        res.status(500).json({ error: 'SDK check failed' });
    }
});


// ==========================================
// 5. SERVER BOOT
// ==========================================
const PORT = process.env.PORT || 3000;

initDb().then(databaseInstance => {
    db = databaseInstance;
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("Failed to initialize database:", err);
});