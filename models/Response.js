const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlaySession', required: true },
    roundNumber: { type: Number, required: true },
    scenarioText: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Which team member submitted this
    userResponse: { type: String, default: '' }, // Changed from required to optional with default empty string
    customName: { type: String, default: '' }, // Store the custom name/role at time of submission
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SessionResponse', responseSchema);


