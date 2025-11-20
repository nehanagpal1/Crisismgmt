const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (!req.session.userId || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

// GET all users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST create new user
router.post('/users', isAdmin, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Validation
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    if (!['user', 'trainer', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Create user (password will be hashed by User model pre-save hook)
    const newUser = new User({
      username,
      email: email || '',
      password: password,
      role: role || 'user'
    });
    
    await newUser.save();
    
    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;
    
    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      user: userResponse 
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// PUT update user
router.put('/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, password } = req.body;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent admin from demoting themselves
    if (id === req.session.userId && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot change your own admin role' });
    }
    
    // Update fields
    if (email !== undefined) user.email = email;
    if (role && ['user', 'trainer', 'admin'].includes(role)) {
      user.role = role;
    }
    if (password) {
      // Password will be hashed by User model pre-save hook
      user.password = password;
    }
    
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({ 
      success: true, 
      message: 'User updated successfully',
      user: userResponse 
    });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// DELETE user
router.delete('/users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent admin from deleting themselves
    if (id === req.session.userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// GET trainer's scenarios
router.get('/trainer/:trainerId/scenarios', isAdmin, async (req, res) => {
  try {
    const { trainerId } = req.params;
    const Scenario = require('../models/Scenario');
    
    const scenarios = await Scenario.find({ trainerId }).sort({ createdAt: -1 });
    res.json(scenarios);
  } catch (err) {
    console.error('Error fetching trainer scenarios:', err);
    res.status(500).json({ error: 'Failed to fetch scenarios' });
  }
});

// GET trainer's sessions
router.get('/trainer/:trainerId/sessions', isAdmin, async (req, res) => {
  try {
    const { trainerId } = req.params;
    const PlaySession = require('../models/Session');
    
    const sessions = await PlaySession.find({ trainerId })
      .populate('scenarioId', 'title numRounds')
      .populate('teamMembers.userId', 'username')
      .sort({ createdAt: -1 });
    
    res.json(sessions);
  } catch (err) {
    console.error('Error fetching trainer sessions:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

module.exports = router;

