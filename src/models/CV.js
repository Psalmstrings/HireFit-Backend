const mongoose = require('mongoose');

const workExperienceSchema = new mongoose.Schema({
  company: { type: String, default: '' },
  jobTitle: { type: String, default: '' },
  location: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  current: { type: Boolean, default: false },
  responsibilities: [{ type: String }],
  achievements: [{ type: String }]
}, { _id: false });

const educationSchema = new mongoose.Schema({
  institution: { type: String, default: '' },
  degree: { type: String, default: '' },
  field: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  role: { type: String, default: '' },
  technologies: [{ type: String }],
  url: { type: String, default: '' },
  achievements: [{ type: String }]
}, { _id: false });

const additionalSectionSchema = new mongoose.Schema({
  sectionTitle: { type: String, default: '' },
  content: { type: String, default: '' }
}, { _id: false });

const coreSkillsSchema = new mongoose.Schema({
  frontendDevelopment: [{ type: String }],
  backendDevelopment: [{ type: String }],
  technicalSkills: [{ type: String }],
  softSkills: [{ type: String }],
  databases: [{ type: String }],
  toolsAndTechnologies: [{ type: String }]
}, { _id: false });

const techStackSchema = new mongoose.Schema({
  languages: [{ type: String }],
  frontend: [{ type: String }],
  backend: [{ type: String }],
  database: [{ type: String }],
  versionControl: [{ type: String }],
  other: [{ type: String }]
}, { _id: false });

const parsedDataSchema = new mongoose.Schema({
  personalInfo: {
    fullName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    github: { type: String, default: '' }
  },
  professionalTitle: { type: String, default: '' },
  professionalSummary: { type: String, default: '' },
  careerObjective: { type: String, default: '' },
  targetRoles: [{ type: String }],
  skills: {
    technical: [{ type: String }],
    soft: [{ type: String }],
    tools: [{ type: String }],
    languages: [{ type: String }]
  },
  coreSkills: { type: coreSkillsSchema, default: () => ({}) },
  techStack: { type: techStackSchema, default: () => ({}) },
  workExperience: [workExperienceSchema],
  projectExperience: [projectSchema],
  projects: [projectSchema],
  education: [educationSchema],
  certifications: [{ type: mongoose.Schema.Types.Mixed }],
  awards: [{ type: mongoose.Schema.Types.Mixed }],
  achievements: [{ type: mongoose.Schema.Types.Mixed }],
  volunteerExperience: [{ type: mongoose.Schema.Types.Mixed }],
  publications: [{ type: mongoose.Schema.Types.Mixed }],
  training: [{ type: mongoose.Schema.Types.Mixed }],
  courses: [{ type: mongoose.Schema.Types.Mixed }],
  languages: [{ type: mongoose.Schema.Types.Mixed }],
  professionalMemberships: [{ type: mongoose.Schema.Types.Mixed }],
  references: [{ type: mongoose.Schema.Types.Mixed }],
  additionalSections: [additionalSectionSchema],
  additionalInformation: [{ type: String }]
}, { _id: false });

const parsingMetadataSchema = new mongoose.Schema({
  totalPages: { type: Number, default: 1 },
  processedPages: { type: Number, default: 1 },
  extractedCharacterCount: { type: Number, default: 0 },
  extractedWordCount: { type: Number, default: 0 },
  parserVersion: { type: String, default: '2.0.0-master' },
  parsingStatus: { type: String, default: 'success' },
  extractedAt: { type: Date, default: Date.now }
}, { _id: false });

const cvSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a CV title'],
    trim: true,
    maxlength: 120
  },
  name: {
    type: String,
    trim: true
  },
  originalFile: {
    url: { type: String, required: true },
    publicId: { type: String, default: '' },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storageType: { type: String, enum: ['cloudinary', 'local'], default: 'local' }
  },
  extractedRawText: {
    type: String,
    default: ''
  },
  originalExtractedText: {
    type: String,
    default: ''
  },
  parsingMetadata: {
    type: parsingMetadataSchema,
    default: () => ({})
  },
  documentStructure: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  parsedData: {
    type: parsedDataSchema,
    default: () => ({})
  },
  isParsed: {
    type: Boolean,
    default: false
  },
  parseStatus: {
    type: String,
    enum: ['pending', 'extracting', 'parsed', 'failed'],
    default: 'pending'
  },
  parseError: {
    type: String,
    default: null
  },
  targetRole: {
    type: String,
    default: '',
    trim: true
  },
  selectedTemplate: {
    type: String,
    enum: ['modern', 'minimal', 'executive'],
    default: 'modern'
  },
  versionsCount: {
    type: Number,
    default: 1
  },
  activeVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CVVersion',
    default: null
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

cvSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CV', cvSchema);
