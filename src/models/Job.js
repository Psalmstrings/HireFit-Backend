const mongoose = require('mongoose');

const structuredJobSchema = new mongoose.Schema({
  jobTitle: { type: String, default: '' },
  company: { type: String, default: '' },
  location: { type: String, default: '' },
  seniority: { type: String, default: 'Not specified' },
  industry: { type: String, default: 'Technology' },
  remoteType: {
    type: String,
    enum: ['Remote', 'Hybrid', 'On-site', 'Not specified'],
    default: 'Not specified'
  },
  requiredSkills: [{ type: String }],
  preferredSkills: [{ type: String }],
  responsibilities: [{ type: String }],
  qualifications: [{ type: String }],
  keywords: [{ type: String }],
  experienceRequirements: [{ type: String }],
  educationRequirements: [{ type: String }],
  certifications: [{ type: String }],
  tools: [{ type: String }],
  softSkills: [{ type: String }]
}, { _id: false });

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    default: 'Company'
  },
  rawText: {
    type: String,
    required: true
  },
  structuredData: {
    type: structuredJobSchema,
    default: () => ({})
  },
  isParsed: {
    type: Boolean,
    default: false
  },
  sourceType: {
    type: String,
    enum: ['pasted', 'uploaded'],
    default: 'pasted'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Job', jobSchema);
