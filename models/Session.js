const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Support both single user (legacy) and team of users
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Legacy single user
    teamMembers: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      customName: { type: String, default: '' }, // Custom name/role assigned by trainer
      hasSubmitted: { type: Boolean, default: false } // Track if this user has submitted for current round
    }],
    scenarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Scenario', required: true },
    currentRound: { type: Number, default: 1 }, // Track current round for team coordination
    status: { type: String, enum: ['active', 'rejected', 'submitted', 'analysing', 'pending_analysis', 'completed', 'archived'], default: 'active' },
    trainerNotes: { type: String, default: '' },
    reportSummary: { type: String, default: '' },
    behaviouralInterpretation: {
      emotionalTone: { type: String, default: '' },
      cognitiveState: { type: String, default: '' },
      behaviouralSignals: { type: String, default: '' }
    },
    whatCouldBeBetter: { type: String, default: '' },
    teamPerformance: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

module.exports = mongoose.model('PlaySession', sessionSchema);
