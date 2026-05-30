/**
 * middleware/requireAdmin.js
 * Verifies the admin JWT from the Authorization header and confirms the
 * isAdmin flag is still set in the database (supports revocation).
 */

const jwt         = require('jsonwebtoken')
const UserProfile = require('../models/UserProfile')

async function requireAdmin(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No admin token provided.' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    if (!payload.isAdmin) return res.status(403).json({ error: 'Access denied.' })

    // Confirm the flag is still set in DB (in case it was revoked)
    const profile = await UserProfile.findOne({ userId: payload.userId })
    if (!profile || !profile.isAdmin) return res.status(403).json({ error: 'Access denied.' })

    req.adminUserId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin token.' })
  }
}

module.exports = requireAdmin
