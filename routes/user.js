const express = require('express');
const router = express.Router();
const PlaySession = require('../models/Session');
const Scenario = require('../models/Scenario');
const SessionResponse = require('../models/Response');
const { generateNextScenario, usingGemini } = require('../utils/ai');

function requireLogin(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
}

router.get('/api/debug/ai', (req, res) => {
    res.json({ usingGemini: !!usingGemini, aiEngine: 'Google Gemini' });
});

// Get all sessions assigned to this user (team sessions)
router.get('/api/user/my-sessions', requireLogin, async (req, res) => {
    try {
        // Find all sessions where this user is a team member
        const sessions = await PlaySession.find({ 
            'teamMembers.userId': req.session.userId,
            status: { $in: ['active', 'submitted', 'analysing', 'pending_analysis', 'completed'] }
        }).populate('scenarioId', 'title description').sort({ createdAt: -1 });
        
        const sessionData = sessions.map(s => {
            const teamMember = s.teamMembers.find(tm => tm.userId.toString() === req.session.userId);
            return {
                sessionId: s._id,
                scenarioTitle: s.scenarioId?.title || 'Untitled',
                customName: teamMember?.customName || '',
                teamSize: s.teamMembers.length,
                status: s.status,
                currentRound: s.currentRound || 1
            };
        });
        
        res.json(sessionData);
    } catch (err) {
        console.error('Get my sessions error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// Handle team session submission - collects all 5 users' responses
async function handleTeamSubmission(req, res, session, roundNumber, prevScenario, userResponse) {
    try {
        const scenarioDoc = await Scenario.findById(session.scenarioId);
        const teamMember = session.teamMembers.find(tm => tm.userId.toString() === req.session.userId);
        
        // Delete any placeholder for this round (from previous round's generation)
        // Also delete any responses with empty userResponse for this round
        await SessionResponse.deleteMany({
            sessionId: session._id,
            roundNumber,
            $or: [
                { customName: 'SCENARIO_PLACEHOLDER' },
                { userResponse: '' }
            ]
        });
        
        // Save this user's response
        await SessionResponse.create({
            sessionId: session._id,
            roundNumber,
            scenarioText: prevScenario,
            userId: req.session.userId,
            userResponse,
            customName: teamMember?.customName || ''
        });
        
        // Mark this team member as having submitted for this round
        const memberIndex = session.teamMembers.findIndex(tm => tm.userId.toString() === req.session.userId);
        if (memberIndex !== -1) {
            session.teamMembers[memberIndex].hasSubmitted = true;
        }
        
        // Check if all team members have submitted for this round by counting actual responses
        const roundResponsesCount = await SessionResponse.countDocuments({
            sessionId: session._id,
            roundNumber,
            userResponse: { $exists: true, $ne: '' },
            customName: { $ne: 'SCENARIO_PLACEHOLDER' }
        });
        
        const totalMembers = session.teamMembers.length;
        const allSubmitted = roundResponsesCount >= totalMembers;
        
        console.log(`[SUBMIT] Round ${roundNumber}: ${roundResponsesCount}/${totalMembers} submitted. All submitted: ${allSubmitted}`);
        
        if (!allSubmitted) {
            // Save session with updated hasSubmitted flag
            await session.save();
            // Wait for other team members
            return res.json({ 
                waiting: true, 
                message: `Response submitted. Waiting for other team members... (${roundResponsesCount}/${totalMembers} submitted)`,
                nextScenario: null,
                completed: false
            });
        }
        
        // All team members have submitted - generate next scenario
        console.log(`[SUBMIT] All ${totalMembers} team members submitted for round ${roundNumber}. Generating next scenario...`);
        
        // Reset hasSubmitted flags for next round
        session.teamMembers.forEach(tm => tm.hasSubmitted = false);
        
        // Collect all responses for this round
        const roundResponses = await SessionResponse.find({ 
            sessionId: session._id, 
            roundNumber,
            userResponse: { $exists: true, $ne: '' },
            customName: { $ne: 'SCENARIO_PLACEHOLDER' }
        }).populate('userId', 'username');
        
        console.log(`[SUBMIT] Found ${roundResponses.length} responses for AI generation`);
        
        const combinedResponse = roundResponses.map(r => 
            `${r.customName || r.userId.username}: ${r.userResponse}`
        ).join('\n\n');
        
        // Fetch complete history
        const historyDocs = await SessionResponse.find({ 
            sessionId: session._id 
        }).sort({ roundNumber: 1, createdAt: 1 });
        
        // Group by round and combine team responses
        const historyByRound = {};
        historyDocs.forEach(r => {
            if (!historyByRound[r.roundNumber]) {
                historyByRound[r.roundNumber] = {
                    round: r.roundNumber,
                    scenario: r.scenarioText,
                    responses: []
                };
            }
            historyByRound[r.roundNumber].responses.push({
                user: r.customName || 'Team Member',
                response: r.userResponse
            });
        });
        
        const history = Object.values(historyByRound).map(h => ({
            round: h.round,
            scenario: h.scenario,
            response: h.responses.map(r => `${r.user}: ${r.response}`).join('\n')
        }));
        
        console.log('[TEAM AI SUBMIT] Round', roundNumber, '→ Generating Round', Number(roundNumber) + 1);
        console.log('  Team Size:', roundResponses.length);
        console.log('  Combined Response Length:', combinedResponse.length);
        
        const nextText = await generateNextScenario({
            scenarioTitle: scenarioDoc?.title || 'Incident',
            scenarioType: scenarioDoc?.templateType || 'custom',
            scenarioDescription: scenarioDoc?.description || '',
            initialSituation: scenarioDoc?.initialText || prevScenario,
            previousScenario: prevScenario,
            teamResponse: combinedResponse,
            round: Number(roundNumber) || 1,
            history
        });
        
        const totalRounds = scenarioDoc?.numRounds || 5;
        if (Number(roundNumber) >= totalRounds) {
            session.status = 'submitted';
            session.completedAt = new Date();
            await session.save();
            return res.json({ nextScenario: null, completed: true });
        }
        
        // Save the next scenario to database so ALL team members can fetch it via polling
        const nextRoundNum = Number(roundNumber) + 1;
        await SessionResponse.create({
            sessionId: session._id,
            roundNumber: nextRoundNum,
            scenarioText: nextText,
            userId: session.teamMembers[0].userId, // Use first team member as placeholder
            userResponse: '', // Empty placeholder - will be filled when they submit
            customName: 'SCENARIO_PLACEHOLDER'
        });
        
        console.log(`[SUBMIT] Next scenario saved to DB for round ${nextRoundNum}. All users will poll for it.`);
        
        // Update current round and save
        session.currentRound = nextRoundNum;
        await session.save();
        
        console.log(`[SUBMIT] Session updated. Current round now: ${session.currentRound}`);
        
        // Return waiting=true so this user also polls for the scenario
        // This ensures all users move to next round simultaneously
        res.json({ 
            waiting: true, 
            message: 'All team members submitted! Loading next scenario...',
            nextScenario: null, 
            completed: false 
        });
    } catch (err) {
        console.error('Team submission error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
}

// Get specific session by ID
router.get('/api/user/session/:id', requireLogin, async (req, res) => {
    try {
        const { id } = req.params;
        const session = await PlaySession.findOne({
            _id: id,
            'teamMembers.userId': req.session.userId
        }).populate('scenarioId', 'title initialText numRounds responseTimerSec');
        
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        const teamMember = session.teamMembers.find(tm => tm.userId.toString() === req.session.userId);
        res.json({
            sessionId: session._id,
            scenarioTitle: session.scenarioId.title,
            initialText: session.scenarioId.initialText,
            numRounds: session.scenarioId.numRounds || 5,
            responseTimerSec: session.scenarioId.responseTimerSec || 120,
            isTeamSession: true,
            customName: teamMember?.customName || '',
            currentRound: session.currentRound || 1,
            status: session.status
        });
    } catch (err) {
        console.error('Get session by ID error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// Check if next scenario is ready (for polling)
router.get('/api/user/check-next-scenario', requireLogin, async (req, res) => {
    try {
        const { sessionId, round } = req.query;
        const session = await PlaySession.findById(sessionId);
        
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        // Check if session is completed
        if (session.status === 'submitted' || session.status === 'completed') {
            return res.json({ completed: true });
        }
        
        // Check if next round scenario has been generated
        const nextRoundNum = Number(round) + 1;
        const nextScenario = await SessionResponse.findOne({
            sessionId,
            roundNumber: nextRoundNum,
            scenarioText: { $exists: true, $ne: '' }
        });
        
        // If next scenario exists and current round has moved forward, it's ready
        if (nextScenario && session.currentRound >= nextRoundNum) {
            console.log(`[POLL] User ${req.session.userId} found next scenario for round ${nextRoundNum}`);
            return res.json({ ready: true, nextScenario: nextScenario.scenarioText });
        }
        
        res.json({ ready: false });
    } catch (err) {
        console.error('Check next scenario error:', err);
        res.status(500).json({ error: err.message || 'Server error' });
    }
});

// Get active session for this user (supports both single and team sessions)
router.get('/api/user/active-session', requireLogin, async (req, res) => {
    // Check if user is in a team session
    const teamSession = await PlaySession.findOne({ 
        'teamMembers.userId': req.session.userId, 
        status: 'active' 
    }).populate('scenarioId', 'title initialText numRounds responseTimerSec');
    
    if (teamSession) {
        // Find this user's custom name/role
        const teamMember = teamSession.teamMembers.find(tm => tm.userId.toString() === req.session.userId);
        return res.json({
            sessionId: teamSession._id,
            scenarioTitle: teamSession.scenarioId.title,
            initialText: teamSession.scenarioId.initialText,
            numRounds: teamSession.scenarioId.numRounds || 5,
            responseTimerSec: teamSession.scenarioId.responseTimerSec || 120,
            isTeamSession: true,
            customName: teamMember?.customName || '',
            currentRound: teamSession.currentRound || 1
        });
    }
    
    // Legacy single user session
    const session = await PlaySession.findOne({ userId: req.session.userId, status: 'active' }).populate('scenarioId', 'title initialText numRounds responseTimerSec');
    if (!session) return res.json(null);
    res.json({
        sessionId: session._id,
        scenarioTitle: session.scenarioId.title,
        initialText: session.scenarioId.initialText,
        numRounds: session.scenarioId.numRounds || 5,
        responseTimerSec: session.scenarioId.responseTimerSec || 120,
        isTeamSession: false
    });
});

// Submit response and get next scenario via AI
router.post('/api/user/submit-response', requireLogin, async (req, res) => {
    const { sessionId, roundNumber, prevScenario, userResponse } = req.body;
    
    // Check if this is a team session
    const teamSession = await PlaySession.findOne({ 
        _id: sessionId, 
        'teamMembers.userId': req.session.userId, 
        status: 'active' 
    });
    
    if (teamSession) {
        // Handle team session submission
        return handleTeamSubmission(req, res, teamSession, roundNumber, prevScenario, userResponse);
    }
    
    // Legacy single user session
    const session = await PlaySession.findOne({ _id: sessionId, userId: req.session.userId, status: 'active' });
    if (!session) return res.status(400).json({ error: 'Invalid session' });

    const scenarioDoc = await Scenario.findById(session.scenarioId);
    
    // STEP 1: Save the current round's response FIRST
    await SessionResponse.findOneAndUpdate(
        { sessionId, roundNumber },
        { sessionId, roundNumber, scenarioText: prevScenario, userResponse },
        { upsert: true, new: true }
    );

    // STEP 2: Remove any placeholder for the next round (to avoid ghost entries)
    await SessionResponse.deleteMany({ sessionId, userResponse: null, roundNumber: Number(roundNumber) + 1 });

    // STEP 3: NOW fetch the complete history INCLUDING the current round we just saved
    const historyDocs = await SessionResponse.find({ sessionId, userResponse: { $ne: null } }).sort({ roundNumber: 1 });
    const history = historyDocs.map(r => ({ round: r.roundNumber, scenario: r.scenarioText, response: r.userResponse }));

    // Log context for debugging
    console.log('[AI SUBMIT] Round', roundNumber, '→ Generating Round', Number(roundNumber) + 1);
    console.log('  Scenario Type:', scenarioDoc?.templateType);
    console.log('  Previous Scenario:', prevScenario.substring(0, 100) + '...');
    console.log('  User Response:', userResponse.substring(0, 100));
    console.log('  History Length:', history.length, 'rounds');
    console.log('  Full History:', JSON.stringify(history, null, 2));

    const nextText = await generateNextScenario({
        scenarioTitle: scenarioDoc?.title || 'Incident',
        scenarioType: scenarioDoc?.templateType || 'custom',
        scenarioDescription: scenarioDoc?.description || '',
        initialSituation: scenarioDoc?.initialText || prevScenario,
        previousScenario: prevScenario,
        teamResponse: userResponse,
        round: Number(roundNumber) || 1,
        history
    });

    let completed = false;
    const totalRounds = scenarioDoc?.numRounds || 5;
    if (Number(roundNumber) >= totalRounds) {
        completed = true;
        session.status = 'submitted'; // was 'analysing'
        await session.save();
        return res.json({ nextScenario: null, completed });
    }

    await SessionResponse.findOneAndUpdate(
        { sessionId, roundNumber: Number(roundNumber) + 1 },
        { sessionId, roundNumber: Number(roundNumber) + 1, scenarioText: nextText, userResponse: null },
        { upsert: true, new: true }
    );

    res.json({ nextScenario: nextText, completed });
});

module.exports = router;
