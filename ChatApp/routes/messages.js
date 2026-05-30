/**
 * routes/messages.js
 * Conversation and message management — fetch history, send via REST,
 * mark read, and retrieve per-conversation unread counts.
 */

const { Router }     = require('express')
const { getAuth }    = require('../middleware/requireAuth')
const Message        = require('../models/message')
const LoomConnection = require('../models/LoomConnection')
const Block          = require('../models/Block')
const UserProfile    = require('../models/UserProfile')

const router = Router()

// GET /api/messages/unread-counts — MUST be defined before /:roomId
router.get('/unread-counts', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const counts = await Message.aggregate([
      { $match: { recipientId: userId, isRead: false } },
      { $group: { _id: '$room', unread: { $sum: 1 } } },
    ])

    const result = counts.map(c => ({
      conversationId: c._id.startsWith('conn_') ? c._id.slice(5) : c._id,
      unread: c.unread,
    }))

    const total = result.reduce((sum, c) => sum + c.unread, 0)

    res.json({ counts: result, total })
  } catch (err) {
    console.error('[unread-counts] error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/conversations — MUST be before /:roomId
router.get('/conversations', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const connections = await LoomConnection.find({
      $or: [{ userAId: userId }, { userBId: userId }],
      isActive: true,
    }).sort({ connectedAt: -1 })

    const conversations = await Promise.all(connections.map(async conn => {
      const otherUserId = conn.userAId === userId ? conn.userBId : conn.userAId
      const roomId      = `conn_${conn._id}`
      const [profile, lastMsg] = await Promise.all([
        UserProfile.findOne({ userId: otherUserId }),
        Message.findOne({ room: roomId }).sort({ createdAt: -1 }),
      ])
      return {
        connectionId:     String(conn._id),
        otherUserId,
        displayName:      profile?.displayName      || null,
        verificationTier: profile?.verificationTier || 'unverified',
        connectedAt:      conn.connectedAt,
        lastMessage:      lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.createdAt, senderId: lastMsg.sender }
          : null,
      }
    }))

    res.json({ conversations })
  } catch (err) {
    console.error('[conversations] error:', err)
    res.status(500).json({ error: 'Failed to fetch conversations.' })
  }
})

// POST /api/messages
router.post('/', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { conversationId, content, recipientId } = req.body
    if (!conversationId || !content?.trim())
      return res.status(400).json({ error: 'conversationId and content are required' })

    const conn = await LoomConnection.findById(conversationId)
    if (!conn || !conn.isActive || (conn.userAId !== userId && conn.userBId !== userId))
      return res.status(403).json({ error: 'Forbidden.' })

    const otherUserId = conn.userAId === userId ? conn.userBId : conn.userAId
    const blocked = await Block.findOne({
      $or: [
        { blockerId: userId,      blockedUserId: otherUserId },
        { blockerId: otherUserId, blockedUserId: userId      },
      ],
    })
    if (blocked) return res.status(403).json({ error: 'Forbidden.' })

    const room    = `conn_${conversationId}`
    const message = await Message.create({
      sender:      userId,
      content:     content.trim(),
      room,
      recipientId: recipientId || otherUserId,
    })

    const payload = {
      _id:            message._id,
      sender:         userId,
      senderId:       userId,
      content:        message.content,
      time:           message.createdAt,
      room,
      conversationId,
      roomName:       '',
    }

    const io = req.app.locals.io
    if (io) {
      // Only emit to recipient — sender already has the optimistic message
      io.to(`user:${otherUserId}`).emit('receive_message', payload)
    }

    res.status(201).json({ message })
  } catch (err) {
    console.error('[POST /messages] error:', err)
    res.status(500).json({ error: 'Failed to send message.' })
  }
})

// PATCH /api/messages/:conversationId/read
router.patch('/:conversationId/read', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const room = `conn_${req.params.conversationId}`
    await Message.updateMany(
      { room, recipientId: userId, isRead: false },
      { $set: { isRead: true } }
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[mark-read] error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/messages/:roomId — accepts both 'conn_abc' and plain 'abc'
router.get('/:roomId', async (req, res) => {
  try {
    const { userId } = getAuth(req)
    if (!userId) return res.status(401).json({ error: 'Unauthorized' })

    const { roomId } = req.params
    const room         = roomId.startsWith('conn_') ? roomId : `conn_${roomId}`
    const connectionId = room.slice(5)

    const conn = await LoomConnection.findById(connectionId)
    if (!conn || (conn.userAId !== userId && conn.userBId !== userId))
      return res.status(403).json({ error: 'Forbidden.' })

    const { before, limit = 50 } = req.query
    const filter = { room }
    if (before) filter.createdAt = { $lt: new Date(before) }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    res.json({ messages: messages.reverse() })
  } catch (err) {
    console.error('messages error:', err)
    res.status(500).json({ error: 'Failed to fetch messages.' })
  }
})

module.exports = router
