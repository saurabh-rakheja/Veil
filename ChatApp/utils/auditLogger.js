const crypto  = require('crypto')
const AuditLog = require('../models/AuditLog')

function hashIp(ip) {
  if (!ip) return null
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

async function logAuditEvent(userId, actionType, {
  targetId           = null,
  metadata           = {},
  ip                 = null,
  consentTextVersion = null,
  retainUntil        = null,
} = {}) {
  try {
    await AuditLog.create({
      userId,
      actionType,
      targetId,
      metadata,
      ipHash: hashIp(ip),
      consentTextVersion,
      retainUntil,
    })
  } catch (err) {
    console.error('[auditLogger] failed to write audit event:', actionType, err.message)
  }
}

module.exports = { logAuditEvent }
