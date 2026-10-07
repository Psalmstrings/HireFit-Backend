const mongoose = require('mongoose');

const cvAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    required: true,
    index: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  overallScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  scoreLabel: {
    type: String,
    default: 'AI Job Match Score (Estimate based on supplied CV and Job Description)'
  },
  categoryScores: {
    skillsMatch: { type: Number, default: 0 },
    experienceMatch: { type: Number, default: 0 },
    keywordMatch: { type: Number, default: 0 },
    responsibilityMatch: { type: Number, default: 0 },
    educationMatch: { type: Number, default: 0 },
    atsReadiness: { type: Number, default: 0 }
  },
  matchedSkills: [{
    skill: String,
    candidateEvidence: String,
    jobRequirement: String
  }],
  partialMatches: [{
    skill: String,
    candidateExperience: String,
    missingAspect: String
  }],
  missingSkills: [{
    skill: String,
    importance: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    note: {
      type: String,
      default: 'Not identified in your CV. If you possess this experience, consider adding it to your CV.'
    }
  }],
  evidenceGaps: [{
    requirement: String,
    explanation: String
  }],
  strengths: [{ type: String }],
  recommendations: [{
    title: String,
    category: String,
    description: String,
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' }
  }],
  atsChecklist: [{
    item: String,
    status: { type: String, enum: ['good', 'warning', 'needs_improvement'] },
    feedback: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CVAnalysis', cvAnalysisSchema);
