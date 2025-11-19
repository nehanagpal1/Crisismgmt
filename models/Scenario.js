const mongoose = require('mongoose');

const scenarioSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    initialText: { type: String, required: true },
    templateType: { type: String, enum: ['fire','theft','cyber','civil_unrest','natural_disaster','custom'], default: 'custom' },
    numRounds: { type: Number, default: 5, min: 1, max: 20 },
    responseTimerSec: { type: Number, default: 120, min: 10, max: 900 },
    status: { type: String, enum: ['draft', 'active', 'completed', 'archived'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scenario', scenarioSchema);
