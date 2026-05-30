/**
 * routes/handshake.js
 * Handshake lifecycle — initiate, view pending/sent, accept, decline, withdraw.
 * Accepting a handshake creates a LoomConnection and sends a notification.
 */

const { Router }  = require('express')
const { getAuth } = require('../middleware/requireAuth')
const Handshake       = require('../models/Handshake')
const LoomConnection  = require('../models/LoomConnection')
const ConsentProfile  = require('../models/ConsentProfile')
const UserProfile     = require('../models/UserProfile')
const { calculateCompatibilityScore, detectLimitConflicts } = require('../utils/compatibility')
const { createAndEmit } = require('../services/notificationService')
const { logAuditEvent } = require('../utils/auditLogger')

const router = Router()

// ── POST /api/handshake/initiate ─────────────────────────────────
router.post('/initiate', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req)
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' })

    const { recipientId, introductionMessage } = req.body

    if (recipientId === currentUserId)
      return res.status(400).json({ error: 'You cannot send a handshake to yourself.' })

    if (!introductionMessage || introductionMessage.length < 50)
      return res.status(400).json({ error: 'Introduction message must be at least 50 characters.' })

    if (introductionMessage.length > 300)
      return res.status(400).json({ error: 'Introduction message must be 300 characters or fewer.' })

    const myProfile = await ConsentProfile.findOne({ userId: currentUserId })
    const profileComplete = myProfile && (
      myProfile.isComplete === true ||
      myProfile.isComplete === 'true' ||
      ((myProfile.lookingFor?.length ?? 0) > 0 && myProfile.experienceLevel != null)
    )
    if (!profileComplete)
      return res.status(400).json({ error: 'Complete your consent profile before sending connection requests.' })

    const existingPending = await Handshake.findOne({
      $or: [
        { initiatorId: currentUserId, recipientId, status: 'pending' },
        { initiatorId: recipientId, recipientId: currentUserId, status: 'pending' },
      ],
    })
    if (existingPending)
      return res.status(400).json({ error: 'A pending request already exists between you and this user.' })

    const cooldownHandshake = await Handshake.findOne({
      initiatorId: currentUserId,
      recipientId,
      status: 'declined',
      cooldownUntil: { $gt: new Date() },
    })
    if (cooldownHandshake)
      return res.status(400).json({
        error: 'You are in a cooldown period for this person.',
        cooldownUntil: cooldownHandshake.cooldownUntil,
      })

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const todayCount = await Handshake.countDocuments({
      initiatorId: currentUserId,
      status: 'pending',
      initiatedAt: { $gte: startOfDay },
    })
    if (todayCount >= 5)
      return res.status(429).json({
        error: 'Daily connection limit reached. Upgrade to Premium for unlimited.',
      })

    const handshake = await Handshake.create({ initiatorId: currentUserId, recipientId, introductionMessage })

    const initiatorProfile = await UserProfile.findOne({ userId: currentUserId })
    createAndEmit(req.app.locals.io, recipientId, 'handshake_received', {
      actorId:          currentUserId,
      actorDisplayName: initiatorProfile?.displayName || null,
      handshakeId:      String(handshake._id),
    })

    logAuditEvent(currentUserId, 'handshake_initiated', {
      targetId: recipientId,
      metadata: { handshakeId: String(handshake._id) },
      ip: req.ip,
    })

    res.status(201).json(handshake)
  } catch (err) {
    console.error('initiate error:', err)
    res.status(500).json({ error: 'Failed to initiate handshake.' })
  }
})

// ── GET /api/handshake/pending — incoming requests ────────────────
router.get('/pending', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req)
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' })

    const handshakes = await Handshake.find({ recipientId: currentUserId, status: 'pending' })
      .sort({ initiatedAt: -1 })

    const myProfile = await ConsentProfile.findOne({ userId: currentUserId })

    const enriched = await Promise.all(handshakes.map(async h => {
      const [initiatorConsent, initiatorProfile] = await Promise.all([
        ConsentProfile.findOne({ userId: h.initiatorId }),
        UserProfile.findOne({ userId: h.initiatorId }),
      ])
      return {
        _id:                 h._id,
        initiatorId:         h.initiatorId,
        introductionMessage: h.introductionMessage,
        initiatedAt:         h.initiatedAt,
        expiresAt:           h.expiresAt,
        displayName:         initiatorProfile?.displayName || null,
        city:                initiatorProfile?.city        || null,
        verificationTier:    initiatorProfile?.verificationTier || 'unverified',
        compatibilityScore:  calculateCompatibilityScore(
          myProfile?.interests ?? [],
          initiatorConsent?.interests ?? [],
        ),
      }
    }))

    res.json(enriched)
  } catch (err) {
    console.error('pending error:', err)
    res.status(500).json({ error: 'Failed to fetch pending requests.' })
  }
})

// ── GET /api/handshake/sent ───────────────────────────────────────
router.get('/sent', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req)
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' })

    const handshakes = await Handshake.find({ initiatorId: currentUserId }).sort({ initiatedAt: -1 })
    res.json(handshakes.map(h => ({
      _id:                 h._id,
      recipientId:         h.recipientId,
      status:              h.status,
      introductionMessage: h.introductionMessage,
      initiatedAt:         h.initiatedAt,
      resolvedAt:          h.resolvedAt,
      expiresAt:           h.expiresAt,
      cooldownUntil:       h.cooldownUntil,
    })))
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sent requests.' })
  }
})

// ── GET /api/handshake/:id — single handshake ─────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req)
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' })

    const handshake = await Handshake.findById(req.params.id)
    if (!handshake) return res.status(404).json({ error: 'Handshake not found.' })

    if (handshake.initiatorId !== currentUserId && handshake.recipientId !== currentUserId)
      return res.status(403).json({ error: 'Forbidden.' })

    const isRecipient  = handshake.recipientId === currentUserId
    const otherUserId  = isRecipient ? handshake.initiatorId : handshake.recipientId
    const myProfile    = await ConsentProfile.findOne({ userId: currentUserId })
    const [otherConsent, otherProfile] = await Promise.all([
      ConsentProfile.findOne({ userId: otherUserId }),
      UserProfile.findOne({ userId: otherUserId }),
    ])

    const myInterests    = myProfile?.interests    ?? []
    const otherInterests = otherConsent?.interests ?? []
    const myLimits       = myProfile?.limits       ?? []

    res.json({
      ...handshake.toObject(),
      otherUser: {
        userId:           otherUserId,
        displayName:      otherProfile?.displayName      || null,
        city:             otherProfile?.city             || null,
        verificationTier: otherProfile?.verificationTier || 'unverified',
        experienceLevel:  otherConsent?.experienceLevel  || null,
        lookingFor:       otherConsent?.lookingFor        || [],
        interests:        otherInterests,
      },
      compatibilityScore: calculateCompatibilityScore(myInterests, otherInterests),
      limitConflicts:     detectLimitConflicts(myLimits, otherInterests),
      sharedInterests:    myInterests.filter(t => new Set(otherInterests).has(t)),
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch handshake.' })
  }
})

// ── POST /api/handshake/:id/accept ────────────────────────────────
router.post('/:id/accept', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req)
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' })

    const handshake = await Handshake.findById(req.params.id)
    if (!handshake)                               return res.status(404).json({ error: 'Handshake not found.' })
    if (handshake.recipientId !== currentUserId)  return res.status(403).json({ error: 'Forbidden.' })
    if (handshake.status !== 'pending')           return res.status(400).json({ error: 'This request is no longer pending.' })
    if (handshake.expiresAt < new Date())         return res.status(400).json({ error: 'This request has expired.' })

    const [initiatorConsent, recipientConsent] = await Promise.all([
      ConsentProfile.findOne({ userId: handshake.initiatorId }),
      ConsentProfile.findOne({ userId: handshake.recipientId }),
    ])

    const iInterests = initiatorConsent?.interests ?? []
    const rInterests = recipientConsent?.interests ?? []
    const shared     = iInterests.filter(t => new Set(rInterests).has(t))
    const conflicts  = [
      ...detectLimitConflicts(initiatorConsent?.limits ?? [], rInterests),
      ...detectLimitConflicts(recipientConsent?.limits ?? [], iInterests),
    ]

    handshake.status      = 'accepted'
    handshake.resolvedAt  = new Date()
    handshake.compatibilitySnapshot = {
      initiatorInterests: iInterests,
      recipientInterests: rInterests,
      sharedInterests:    shared,
      compatibilityScore: calculateCompatibilityScore(iInterests, rInterests),
      limitConflicts:     [...new Set(conflicts)],
      snapshotTakenAt:    new Date(),
    }
    await handshake.save()

    const connection = await LoomConnection.create({
      userAId:     handshake.initiatorId,
      userBId:     handshake.recipientId,
      handshakeId: handshake._id,
      initiatedBy: handshake.initiatorId,
    })

    const recipientProfile = await UserProfile.findOne({ userId: currentUserId })
    createAndEmit(req.app.locals.io, handshake.initiatorId, 'handshake_accepted', {
      actorId:          currentUserId,
      actorDisplayName: recipientProfile?.displayName || null,
      handshakeId:      String(handshake._id),
    })

    logAuditEvent(currentUserId, 'handshake_accepted', {
      targetId: handshake.initiatorId,
      metadata: {
        handshakeId:        String(handshake._id),
        compatibilityScore: handshake.compatibilitySnapshot?.compatibilityScore,
        sharedInterests:    handshake.compatibilitySnapshot?.sharedInterests,
      },
      ip: req.ip,
    })

    res.json({ handshake, connection })
  } catch (err) {
    console.error('accept error:', err)
    res.status(500).json({ error: 'Failed to accept handshake.' })
  }
})

// ── POST /api/handshake/:id/decline ──────────────────────────────
router.post('/:id/decline', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req)
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' })

    const handshake = await Handshake.findById(req.params.id)
    if (!handshake)                              return res.status(404).json({ error: 'Handshake not found.' })
    if (handshake.recipientId !== currentUserId) return res.status(403).json({ error: 'Forbidden.' })
    if (handshake.status !== 'pending')          return res.status(400).json({ error: 'This request is no longer pending.' })

    handshake.status        = 'declined'
    handshake.resolvedAt    = new Date()
    handshake.cooldownUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await handshake.save()

    const declinerProfile = await UserProfile.findOne({ userId: currentUserId })
    createAndEmit(req.app.locals.io, handshake.initiatorId, 'handshake_declined', {
      actorId:          currentUserId,
      actorDisplayName: declinerProfile?.displayName || null,
      handshakeId:      String(handshake._id),
    })

    logAuditEvent(currentUserId, 'handshake_declined', {
      targetId: handshake.initiatorId,
      metadata: { handshakeId: String(handshake._id) },
      ip: req.ip,
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline handshake.' })
  }
})

// ── POST /api/handshake/:id/withdraw ─────────────────────────────
router.post('/:id/withdraw', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req)
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' })

    const handshake = await Handshake.findById(req.params.id)
    if (!handshake)                               return res.status(404).json({ error: 'Handshake not found.' })
    if (handshake.initiatorId !== currentUserId)  return res.status(403).json({ error: 'Forbidden.' })
    if (handshake.status !== 'pending')           return res.status(400).json({ error: 'This request is no longer pending.' })

    handshake.status     = 'withdrawn'
    handshake.resolvedAt = new Date()
    await handshake.save()

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to withdraw handshake.' })
  }
})

module.exports = router
