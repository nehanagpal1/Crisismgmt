const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register - POST /register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }
        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Username already exists.' });
        }
        const user = new User({ username, email, password, role });
        await user.save();
        res.json({ success: true, message: 'User registered.' });
    } catch (e) {
        console.error('Register error on server:', e);
        res.status(500).json({ success: false, message: 'Registration error.' });
    }
});

// Login - POST /login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        const match = await user.comparePassword(password);
        if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        
        req.session.user = user.username;
        req.session.userId = user._id;
        req.session.role = user.role;
        
        // Save session explicitly before responding (important for serverless)
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    reject(err);
                } else {
                    console.log('[Login] Session saved successfully for user:', user.username, 'SessionID:', req.sessionID);
                    resolve();
                }
            });
        });
        
        // Add role-based redirect info for frontend
        let redirect;
        if (user.role === 'user') redirect = '/user-dashboard.html';
        else redirect = '/trainer-dashboard.html';
        res.json({ success: true, role: user.role, username: user.username, redirect });
    } catch (e) {
        console.error('Login error:', e);
        res.status(500).json({ success: false, message: 'Login error.' });
    }
});

// Logout - POST /logout
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

// Session Status - GET /check-session
router.get('/check-session', (req, res) => {
    console.log('[Check-session] SessionID:', req.sessionID, 'User:', req.session.user, 'Role:', req.session.role);
    if (req.session.user) {
        res.json({
          loggedIn: true,
          username: req.session.user,
          role: req.session.role
        });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = router;
