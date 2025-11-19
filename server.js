// Load environment variables
require('dotenv').config();

// AI engine: Using Google Gemini (configured in utils/ai.js)
console.log('[Server] Using Google Gemini AI for scenario generation');

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const scenarioRoutes = require('./routes/scenario');
const trainerRoutes = require('./routes/trainer');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy so secure cookies work correctly behind Vercel/Proxies
app.set('trust proxy', 1);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/login-module';
mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Use MongoDB-backed session store so sessions persist across serverless invocations
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecret-key',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 day in seconds
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use(authRoutes);
app.use(scenarioRoutes);
app.use(trainerRoutes);
app.use(userRoutes);

// Default: redirect based on role if logged in
app.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.role === 'user') {
            return res.redirect('/user-dashboard.html');
        } else {
            return res.redirect('/trainer-dashboard.html');
        }
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Unified app running at http://localhost:${PORT}`);
});

// Export for Vercel
module.exports = app;
