const express = require('express');
const router = express.Router();
const Scenario = require('../models/Scenario');
const PlaySession = require('../models/Session');
const SessionResponse = require('../models/Response');
const User = require('../models/User');

function requireLogin(req, res, next) { if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' }); next(); }
function requireTrainerOrAdmin(req, res, next) { if (req.session.role === 'trainer' || req.session.role === 'admin') return next(); return res.status(403).json({ error: 'Forbidden' }); }

function canTransition(current, next, session) {
  if (current === 'active' && next === 'rejected') return true;
  if (current === 'active' && next === 'submitted') return true;
  if (current === 'submitted' && next === 'analysing') return true;
  if (current === 'analysing' && next === 'completed') return true;
  if ((current === 'active' || current === 'rejected' || current === 'completed') && next === 'archived') return true;
  if (current === next) return true; // allow staying the same for edit
  return false;
}

// List scenarios (own by default, optional status)
router.get('/api/trainer/scenarios', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { createdBy: req.session.userId };
    if (status) query.status = status;
    const items = await Scenario.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('List scenarios error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Scenario detail with editable flag (locked if ANY active session exists for this scenario)
router.get('/api/trainer/scenarios/:id', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const scenario = await Scenario.findById(id);
    if (!scenario) return res.status(404).json({ error: 'Not found' });
    const activeExists = await PlaySession.exists({ scenarioId: id, status: 'active' });
    res.json({ scenario, editable: !activeExists });
  } catch (err) {
    console.error('Get scenario detail error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Create scenario
router.post('/api/trainer/scenarios', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { title, description, initialText, status, templateType, numRounds, responseTimerSec } = req.body;
    if (!title || !initialText) return res.status(400).json({ error: 'title and initialText are required' });
    const doc = await Scenario.create({
      title,
      description: description || '',
      initialText,
      status: status || 'draft',
      templateType: templateType || 'custom',
      numRounds: Number(numRounds) || 5,
      responseTimerSec: Number(responseTimerSec) || 120,
      createdBy: req.session.userId
    });
    res.json(doc);
  } catch (err) {
    console.error('Create scenario error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update scenario (blocked if ANY active session exists for this scenario)
router.put('/api/trainer/scenarios/:id', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const activeExists = await PlaySession.exists({ scenarioId: id, status: 'active' });
    if (activeExists) return res.status(400).json({ error: 'Cannot edit: scenario has active session(s).' });

    const allowed = (({ title, description, initialText, status, templateType, numRounds, responseTimerSec }) => ({ title, description, initialText, status, templateType, numRounds, responseTimerSec }))(req.body);
    const doc = await Scenario.findOneAndUpdate({ _id: id, createdBy: req.session.userId }, allowed, { new: true });
    if (!doc) return res.status(404).json({ error: 'Not found or not owner' });
    res.json(doc);
  } catch (err) {
    console.error('Update scenario error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete scenario (blocked if ANY session exists for this scenario)
router.delete('/api/trainer/scenarios/:id', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if any sessions (active, analysing, completed, or archived) exist for this scenario
    const sessionExists = await PlaySession.exists({ scenarioId: id });
    if (sessionExists) {
      return res.status(400).json({ error: 'Cannot delete: scenario has associated session(s). Please delete the sessions first.' });
    }

    // Delete the scenario
    const doc = await Scenario.findOneAndDelete({ _id: id, createdBy: req.session.userId });
    if (!doc) return res.status(404).json({ error: 'Not found or not owner' });
    
    res.json({ message: 'Scenario deleted successfully', deletedId: id });
  } catch (err) {
    console.error('Delete scenario error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// List ALL users (include current) for assignment
router.get('/api/trainer/users', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('_id username role');
    res.json(users);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Create session (supports both single user and team)
router.post('/api/trainer/sessions', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { userId, scenarioId, status, teamMembers } = req.body;
    
    // Team session (new format)
    if (teamMembers && teamMembers.length > 0) {
      if (!scenarioId) return res.status(400).json({ error: 'scenarioId is required' });
      if (teamMembers.length < 1 || teamMembers.length > 5) {
        return res.status(400).json({ error: 'Team must have between 1 and 5 members' });
      }
      
      const session = await PlaySession.create({ 
        trainerId: req.session.userId, 
        scenarioId, 
        teamMembers,
        status: status || 'active',
        currentRound: 1
      });
      return res.json(session);
    }
    
    // Legacy single user session
    if (!userId || !scenarioId) return res.status(400).json({ error: 'userId and scenarioId are required' });
    const session = await PlaySession.create({ trainerId: req.session.userId, userId, scenarioId, status: status || 'active' });
    res.json(session);
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// List all non-archived sessions for this trainer
router.get('/api/trainer/sessions', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const sessions = await PlaySession.find({ trainerId: req.session.userId, status: { $ne: 'archived' } })
      .populate('userId', 'username role')
      .populate('teamMembers.userId', 'username role')
      .populate('scenarioId', 'title status')
      .sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// List archived sessions
router.get('/api/trainer/sessions-archived', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const sessions = await PlaySession.find({ trainerId: req.session.userId, status: 'archived' })
      .populate('userId', 'username role')
      .populate('scenarioId', 'title status');
    res.json(sessions);
  } catch (err) {
    console.error('List archived sessions error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Update session status with transition rules and auto-archive on completion
router.put('/api/trainer/sessions/:id/status', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params; const { status: next } = req.body;
    const allowed = ['active','rejected','submitted','analysing','pending_analysis','completed','archived'];
    if (!allowed.includes(next)) return res.status(400).json({ error: 'Invalid status' });
    const session = await PlaySession.findOne({ _id: id, trainerId: req.session.userId });
    if (!session) return res.status(404).json({ error: 'Not found' });
    if (!canTransition(session.status, next, session)) return res.status(400).json({ error: `Invalid transition from ${session.status} to ${next}` });

    if (next === 'completed') {
      // mark completed and immediately archive
      if (!session.completedAt) session.completedAt = new Date();
      session.status = 'archived';
      await session.save();
      return res.json(session);
    }

    session.status = next;
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Update session status error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Fallback body-based session status with auto-archive on completion
router.put('/api/trainer/session-status', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id, status: next } = req.body;
    const allowed = ['active','rejected','submitted','analysing','pending_analysis','completed','archived'];
    if (!id || !allowed.includes(next)) return res.status(400).json({ error: 'id and valid status are required' });
    const session = await PlaySession.findOne({ _id: id, trainerId: req.session.userId });
    if (!session) return res.status(404).json({ error: 'Not found' });
    if (!canTransition(session.status, next, session)) return res.status(400).json({ error: `Invalid transition from ${session.status} to ${next}` });

    if (next === 'completed') {
      if (!session.completedAt) session.completedAt = new Date();
      session.status = 'archived';
      await session.save();
      return res.json(session);
    }

    session.status = next;
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Fallback update status error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Set analysis notes/report and mark analysing (not allowed if completed)
router.put('/api/trainer/sessions/:id/analysis', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params; const { trainerNotes, reportSummary } = req.body;
    const session = await PlaySession.findOne({ _id: id, trainerId: req.session.userId });
    if (!session) return res.status(404).json({ error: 'Not found' });
    if (session.status === 'completed') return res.status(400).json({ error: 'Cannot set analysis on a completed session' });
    session.status = 'analysing';
    session.trainerNotes = trainerNotes || '';
    session.reportSummary = reportSummary || '';
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Set analysis error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get responses for a session
router.get('/api/trainer/sessions/:id/responses', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const sess = await PlaySession.findOne({ _id: id, trainerId: req.session.userId });
    if (!sess) return res.status(404).json({ error: 'Not found' });
    const responses = await SessionResponse.find({ 
      sessionId: id,
      userResponse: { $exists: true, $ne: '' },
      customName: { $ne: 'SCENARIO_PLACEHOLDER' }
    })
    .populate('userId', 'username')
    .sort({ roundNumber: 1, createdAt: 1 });
    res.json(responses);
  } catch (err) {
    console.error('Get responses error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Delete session and all associated responses
router.delete('/api/trainer/sessions/:id', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the session (ensure trainer owns it)
    const session = await PlaySession.findOne({ _id: id, trainerId: req.session.userId });
    if (!session) return res.status(404).json({ error: 'Session not found or not owned by you' });
    
    // Delete all associated responses first
    await SessionResponse.deleteMany({ sessionId: id });
    
    // Delete the session
    await PlaySession.findByIdAndDelete(id);
    
    res.json({ message: 'Session and all associated responses deleted successfully', deletedId: id });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Get session for analysis
router.get('/api/trainer/sessions/:id', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const session = await PlaySession.findOne({ _id: id, trainerId: req.session.userId })
      .populate('scenarioId', 'title description')
      .populate('teamMembers.userId', 'username');
    if (!session) return res.status(404).json({ error: 'Not found' });
    res.json(session);
  } catch (err) {
    console.error('Get session for analysis error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// Save full analysis fields (including status update)
router.put('/api/trainer/sessions/:id/analysis-full', requireLogin, requireTrainerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { behaviouralInterpretation = {}, whatCouldBeBetter = '', teamPerformance = '', status } = req.body;
    const session = await PlaySession.findOne({ _id: id, trainerId: req.session.userId });
    if (!session) return res.status(404).json({ error: 'Not found' });
    if (session.status === 'completed') return res.status(400).json({ error: 'Session is already completed.' });

    session.behaviouralInterpretation = {
      emotionalTone: behaviouralInterpretation.emotionalTone || '',
      cognitiveState: behaviouralInterpretation.cognitiveState || '',
      behaviouralSignals: behaviouralInterpretation.behaviouralSignals || ''
    };
    session.whatCouldBeBetter = whatCouldBeBetter || '';
    session.teamPerformance = teamPerformance || '';
    if (status === 'completed') {
      session.status = 'completed';
      session.completedAt = new Date();
    } else if (status === 'pending_analysis') {
      session.status = 'pending_analysis';
    }
    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Full analysis save error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
