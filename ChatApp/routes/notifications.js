/**
 * routes/notifications.js
 * Notification feed — paginated list, unread count, mark individual or all as read.
 */

const { Router }   = require('express')
const { getAuth }  = require('../middleware/requireAuth')
const Notification = require('../models/Notification')

const router = Router()

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { limit = 20, cursor } = req.query
    const filter = { recipientId: userId }
    if (cursor) filter._id = { $lt: cursor }

    const rows = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1)

    const hasMore = rows.length > Number(limit)
    const results = hasMore ? rows.slice(0, Number(limit)) : rows

    res.json({
      notifications: results,
      hasMore,
      nextCursor: hasMore ? results[results.length - 1]._id : null,
    })
  } catch (err) {
    console.error('notifications error:', err)
    res.status(500).json({ error: 'Failed to fetch notifications.' })
  }
})

// GET /api/notifications/unread-count — must be defined before /:id routes
router.get('/unread-count', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const count = await Notification.countDocuments({ recipientId: userId, isRead: false })
    res.json({ count })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unread count.' })
  }
})

// PATCH /api/notifications/read-all — must be defined before /:id routes
router.patch('/read-all', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { $set: { isRead: true } }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read.' })
  }
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: userId },
      { $set: { isRead: true } }
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read.' })
  }
})

module.exports = router
