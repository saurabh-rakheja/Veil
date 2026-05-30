const mongoose = require('mongoose')

const visibilityEnum = ['public', 'connected', 'trusted']

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  lookingFor: [{
    type: String,
    enum: ['genuine_connection', 'community_friendship', 'exploration_curiosity',
           'relationship', 'finding_my_people', 'not_sure'],
  }],

  experienceLevel: {
    type: String,
    enum: ['curious_exploring', 'some_experience', 'experienced', 'deeply_embedded', null],
    default: null,
  },

  interests: [{ type: String }],
  limits:    [{ type: String }],

  dynamicPreference: [{
    type: String,
    enum: ['dominant', 'submissive', 'switch', 'none', 'unsure'],
  }],

  visibilitySettings: {
    displayName:       { type: String, enum: visibilityEnum, default: 'public' },
    city:              { type: String, enum: visibilityEnum, default: 'connected' },
    experienceLevel:   { type: String, enum: visibilityEnum, default: 'connected' },
    lookingFor:        { type: String, enum: visibilityEnum, default: 'connected' },
    interests:         { type: String, enum: visibilityEnum, default: 'connected' },
    limits:            { type: String, enum: visibilityEnum, default: 'trusted' },
    dynamicPreference: { type: String, enum: visibilityEnum, default: 'trusted' },
  },

  isComplete:  { type: Boolean, default: false },
  completedAt: { type: Date,    default: null },
  createdAt:   { type: Date,    default: Date.now },
  updatedAt:   { type: Date,    default: Date.now },
})

schema.pre('save', function (next) {
  this.updatedAt = new Date()
  // Only auto-compute when currently false — never override an explicit true.
  if (!this.isComplete) {
    const autoComplete = (this.lookingFor?.length ?? 0) > 0 && this.experienceLevel != null
    if (autoComplete) this.isComplete = true
  }
  if (this.isComplete && !this.completedAt) this.completedAt = new Date()
  next()
})

module.exports = mongoose.model('ConsentProfile', schema)
