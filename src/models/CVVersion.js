const mongoose = require('mongoose');

const cvVersionSchema = new mongoose.Schema({
  cvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  versionNumber: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true,
    default: 'Original Upload'
  },
  versionName: {
    type: String,
    default: ''
  },
  targetJobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null
  },
  targetJobTitle: {
    type: String,
    default: ''
  },
  targetCompany: {
    type: String,
    default: ''
  },
  jobDescription: {
    type: String,
    default: ''
  },
  originalSnapshot: {
    type: Object,
    default: null
  },
  cvData: {
    type: Object,
    required: true
  },
  optimizedContent: {
    type: Object,
    default: null
  },
  changesSummary: [{
    section: String,
    field: String,
    before: String,
    after: String,
    rationale: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'accepted'
    }
  }],
  preservedSections: [{
    type: String
  }],
  improvedSections: [{
    type: String
  }],
  matchScore: {
    type: Number,
    default: null
  },
  alignmentScoreBefore: {
    type: Number,
    default: null
  },
  alignmentScoreAfter: {
    type: Number,
    default: null
  },
  optimizationMode: {
    type: String,
    enum: ['balanced', 'aggressive', 'conservative'],
    default: 'balanced'
  },
  candidateConfirmedFacts: [{
    type: mongoose.Schema.Types.Mixed
  }],
  analysis: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CVVersion', cvVersionSchema);
