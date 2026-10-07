const mongoose = require('mongoose');

const candidateFactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  masterCvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['skill', 'experience', 'certification', 'responsibility', 'tool'],
    default: 'skill'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  proficiency: {
    type: String,
    enum: ['proficient', 'working_knowledge', 'limited', 'familiar', 'none'],
    default: 'working_knowledge'
  },
  source: {
    type: String,
    enum: ['master_cv', 'candidate_confirmed', 'job_inferred', 'unknown'],
    default: 'candidate_confirmed'
  },
  confirmed: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Composite index to avoid duplicate facts for same user, cv, and skill name
candidateFactSchema.index({ userId: 1, masterCvId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CandidateFact', candidateFactSchema);
