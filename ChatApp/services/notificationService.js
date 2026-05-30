/**
 * services/notificationService.js
 * Creates a Notification document and pushes it to the recipient's
 * personal Socket.IO room in a single atomic step.
 */

const Notification = require('../models/Notification')

/**
 * createAndEmit — creates a Notification document and pushes it to the
 * recipient's personal socket room ('user:<userId>') via Socket.io.
 *
 * @param {import('socket.io').Server} io
 * @param {string} recipientId  — Clerk userId of the recipient
 * @param {string} type         — one of the Notification type enum values
 * @param {object} data         — { actorId, actorDisplayName, handshakeId, ... }
 */
async function createAndEmit(io, recipientId, type, data = {}) {
  try {
    const notification = await Notification.create({ recipientId, type, data })
    if (io) {
      io.to(`user:${recipientId}`).emit('new_notification', notification.toObject())
    }
    return notification
  } catch (err) {
    console.error('[notificationService] createAndEmit error:', err)
  }
}

module.exports = { createAndEmit }
