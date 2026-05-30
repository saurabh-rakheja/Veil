const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  userAId:     { type: String, required: true },
  userBId:     { type: String, required: true },
  handshakeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Handshake' },

  tier: {
    type: String,
    enum: ['connected', 'trusted'],
    default: 'connected',
  },

  connectedAt: { type: Date, default: Date.now },
  isActive:    { type: Boolean, default: true }, // false on block/unmatch; record preserved for audit
  initiatedBy: { type: String },
})

schema.index({ userAId: 1, userBId: 1 })
schema.index({ userBId: 1, userAId: 1 })

schema.statics.getConnection = function (userAId, userBId) {
  return this.findOne({
    $or: [
      { userAId, userBId },
      { userAId: userBId, userBId: userAId },
    ],
    isActive: true,
  })
}

module.exports = mongoose.model('LoomConnection', schema)
