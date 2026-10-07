const mongoose = require('mongoose');

const interviewQuestionSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Technical', 'Behavioral', 'Role-Specific', 'CV-Specific', 'Situational'],
    required: true
  },
  question: {
    type: String,
    required: true
  },
  whyTheyAsk: {
    type: String,
    required: true
  },
  answerStructure: {
    type: String,
    required: true
  },
  candidateTalkingPoints: [{
    type: String
  }],
  userNotes: {
    type: String,
    default: ''
  }
}, { _id: true });

const interviewSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cvId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CV',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  company: {
    type: String,
    default: ''
  },
  jobTitle: {
    type: String,
    default: ''
  },
  questions: [interviewQuestionSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('InterviewSession', interviewSessionSchema);
