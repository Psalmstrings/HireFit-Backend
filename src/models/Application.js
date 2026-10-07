const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  company: {
    type: String,
    required: [true, 'Please provide the company name'],
    trim: true
  },
  jobTitle: {
    type: String,
    required: [true, 'Please provide the job title'],
    trim: true
  },
  jobUrl: {
    type: String,
    trim: true,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  salary: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Saved', 'Applied', 'Interview', 'Assessment', 'Offer', 'Rejected'],
    default: 'Saved'
  },
  cvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    default: null
  },
  cvVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CVVersion',
    default: null
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    default: null
  },
  matchScore: {
    type: Number,
    default: null
  },
  appliedDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

applicationSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Application', applicationSchema);
