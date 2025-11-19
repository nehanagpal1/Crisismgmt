const express = require('express');
const router = express.Router();
const path = require('path');
const PlaySession = require('../models/Session');
const Scenario = require('../models/Scenario');
const SessionResponse = require('../models/Response');
const { generateNextScenario } = require('../utils/ai');

// Temporary in-memory store kept for backwards compatibility (not used for AI)
const submittedResponses = {};

function requireLogin(req, res, next) {
    if (!req.session.user) return res.redirect('/');
    next();
}
function requireTrainerOrAdmin(req, res, next) {
    if (req.session.role === 'trainer' || req.session.role === 'admin') return next();
    res.status(403).send('Forbidden');
}

// Serve scenario game HTML (protected)
router.get('/scenario-game', requireLogin, (req, res) => {
    if (req.session.role !== 'user') return res.redirect('/trainer-dashboard');
    res.sendFile(path.join(__dirname, '../public/scenario-game.html'));
});

// Serve trainer dashboard HTML (kept)
router.get('/trainer-dashboard', requireLogin, requireTrainerOrAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '../public/trainer-dashboard.html'));
});

// Back-compat: POST /next-scenario now uses the same AI flow as /api/user/submit-response
router.post('/next-scenario', requireLogin, async (req, res) => {
    try {
        const { prevScenario, teamResponse, round } = req.body;
        // Use the user's currently active session
        const session = await PlaySession.findOne({ userId: req.session.userId, status: 'active' });
        if (!session) {
            return res.status(400).json({ error: 'No active session for user' });
        }
        const scenarioDoc = await Scenario.findById(session.scenarioId);
        const roundNumber = Number(round) || 1;

        // Persist response
        await SessionResponse.findOneAndUpdate(
            { sessionId: session._id, roundNumber },
            { sessionId: session._id, roundNumber, scenarioText: prevScenario, userResponse: teamResponse },
            { upsert: true, new: true }
        );

        // Build history
        const historyDocs = await SessionResponse.find({ sessionId: session._id }).sort({ roundNumber: 1 });
        const history = historyDocs.map(r => ({ round: r.roundNumber, scenario: r.scenarioText, response: r.userResponse }));

        // Generate next
        const nextText = await generateNextScenario({
            scenarioTitle: scenarioDoc?.title || 'Incident',
            initialSituation: scenarioDoc?.initialText || prevScenario,
            previousScenario: prevScenario,
            teamResponse,
            round: roundNumber,
            history
        });

        const totalRounds = scenarioDoc?.numRounds || 5;
        if (roundNumber >= totalRounds) {
            session.status = 'analysing';
            session.completedAt = new Date();
            await session.save();
            return res.json({ nextScenario: null });
        }

        res.json({ nextScenario: nextText });
    } catch (e) {
        res.status(500).json({ error: 'Generation error' });
    }
});

// Legacy trainer responses view (still available)
router.get('/api/trainer/responses', requireLogin, requireTrainerOrAdmin, (_req, res) => {
    res.json(submittedResponses);
});

module.exports = router;
