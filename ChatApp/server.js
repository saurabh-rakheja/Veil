/**
 * server.js
 * Main entry point. Initialises Express, Socket.IO, connects to MongoDB,
 * validates required environment variables, and registers all API routes.
 */

require('dotenv').config();

const requiredEnvVars = ['MONGODB_URI', 'CLERK_SECRET_KEY', 'JWT_SECRET'];
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const express = require('express');
const http    = require('http');
const cors    = require('cors');
const { Server } = require('socket.io');
const { clerkMiddleware, clerkClient } = require('@clerk/express');
const connectDB           = require('./config/db');
const Message             = require('./models/message');
const Room                = require('./models/room');
const User                = require('./models/user');
const Connection          = require('./models/connection');
const Handshake           = require('./models/Handshake');
const LoomConnection      = require('./models/LoomConnection');
const ConsentProfile      = require('./models/ConsentProfile');
const UserProfile         = require('./models/UserProfile');
const { getAuth }         = require('./middleware/requireAuth');
const { calculateCompatibilityScore, detectLimitConflicts } = require('./utils/compatibility');
const consentProfileRouter = require('./routes/consentProfile');
const discoveryRouter      = require('./routes/discovery');
const handshakeRouter      = require('./routes/handshake');
const reportsRouter        = require('./routes/reports');
const adminRouter          = require('./routes/admin');
const notificationsRouter  = require('./routes/notifications');
const invitesRouter        = require('./routes/invites');
const usersRouter          = require('./routes/users');
const messagesRouter       = require('./routes/messages');
const { createAndEmit }    = require('./services/notificationService');
const { startExpireJob }   = require('./jobs/expireHandshakes');
const Block                = require('./models/Block');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: {
    origin:      process.env.CLIENT_URL || 'http://localhost:5173',
    methods:     ['GET', 'POST'],
    credentials: true,
  },
});

connectDB();
app.locals.io = io;
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.ADMIN_URL  || 'http://localhost:5174',
  ],
  credentials: true,
}));
app.use(express.json());
app.use('/api/admin', adminRouter);
app.use(clerkMiddleware());
app.use(express.static('public'));

app.use('/api/consent-profile', consentProfileRouter);
app.use('/api/discovery',      discoveryRouter);
app.use('/api/handshake',      handshakeRouter);
app.use('/api/reports',        reportsRouter);
app.use('/api/notifications',  notificationsRouter);
app.use('/api/invites',        invitesRouter);
app.use('/api/users',          usersRouter);
app.use('/api/messages',       messagesRouter);

startExpireJob(io);

// ── LoomConnection API ────────────────────────────────────────────

app.get('/api/connections/mine', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const connections = await LoomConnection.find({
      $or: [{ userAId: userId }, { userBId: userId }],
      isActive: true,
    }).sort({ connectedAt: -1 });

    const enriched = await Promise.all(connections.map(async conn => {
      const otherUserId = conn.userAId === userId ? conn.userBId : conn.userAId;
      const roomId = `conn_${conn._id}`;
      const [profile, lastMsg] = await Promise.all([
        UserProfile.findOne({ userId: otherUserId }),
        Message.findOne({ room: roomId }).sort({ createdAt: -1 }),
      ]);
      return {
        connectionId:     String(conn._id),
        otherUserId,
        displayName:      profile?.displayName      || null,
        verificationTier: profile?.verificationTier || 'unverified',
        connectedAt:      conn.connectedAt,
        tier:             conn.tier,
        lastMessage:      lastMsg
          ? { content: lastMsg.content, createdAt: lastMsg.createdAt, senderId: lastMsg.sender }
          : null,
      };
    }));

    res.json({ connections: enriched });
  } catch (err) {
    console.error('connections/mine error:', err);
    res.status(500).json({ error: 'Failed to fetch connections.' });
  }
});

app.get('/api/connections/:connectionId/compatibility', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const conn = await LoomConnection.findById(req.params.connectionId);
    if (!conn || (conn.userAId !== userId && conn.userBId !== userId))
      return res.status(403).json({ error: 'Forbidden.' });

    if (!conn.handshakeId)
      return res.json({ sharedInterests: [], compatibilityScore: 0, snapshotTakenAt: null });

    const hs = await Handshake.findById(conn.handshakeId);
    if (!hs?.compatibilitySnapshot)
      return res.json({ sharedInterests: [], compatibilityScore: 0, snapshotTakenAt: null });

    const { sharedInterests, compatibilityScore, snapshotTakenAt } = hs.compatibilitySnapshot;
    res.json({ sharedInterests: sharedInterests ?? [], compatibilityScore: compatibilityScore ?? 0, snapshotTakenAt });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch compatibility.' });
  }
});

app.post('/api/connections/:connectionId/unmatch', async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const conn = await LoomConnection.findById(req.params.connectionId);
    if (!conn || (conn.userAId !== userId && conn.userBId !== userId))
      return res.status(403).json({ error: 'Forbidden.' });

    conn.isActive = false;
    await conn.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unmatch.' });
  }
});

// ── Users ─────────────────────────────────────────────────────────

app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password, gender, description, tags } = req.body;
    if (!username || !email || !password || !gender)
      return res.status(400).json({ error: 'Username, email, password and gender are required' });
    const user = await User.create({ username, email, password, gender, description: description || '', tags: tags || [] });
    res.json({ _id: user._id, username: user.username, email: user.email, gender: user.gender, description: user.description, tags: user.tags });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      res.status(400).json({ error: `That ${field} is already taken` });
    } else {
      res.status(500).json({ error: 'Failed to create profile' });
    }
  }
});

app.get('/api/users/me', async (req, res) => {
  try {
    const user = await User.findById(req.query.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch { res.status(500).json({ error: 'Failed to fetch user' }); }
});

app.put('/api/users/me', async (req, res) => {
  try {
    const { userId, username, email, password, gender, description, tags } = req.body;
    const updates = { username, email, gender, description, tags };
    if (password) updates.password = password;
    const user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-password');
    res.json(user);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      res.status(400).json({ error: `That ${field} is already taken` });
    } else {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
});

app.get('/api/users/search', async (req, res) => {
  try {
    const { q, excludeId } = req.query;
    if (!q) return res.json([]);
    const filter = { username: { $regex: q, $options: 'i' } };
    if (excludeId) filter._id = { $ne: excludeId };
    const users = await User.find(filter).select('username gender description tags').limit(10);
    res.json(users);
  } catch { res.status(500).json({ error: 'Search failed' }); }
});

// ── Public profile (Loom consent-aware tier system) ──────────────
app.get('/api/users/:userId/public', async (req, res) => {
  try {
    const { userId: currentUserId } = getAuth(req);
    if (!currentUserId) return res.status(401).json({ error: 'Unauthorized' });

    const { userId } = req.params;

    const [targetConsent, targetUserProfile] = await Promise.all([
      ConsentProfile.findOne({ userId }),
      UserProfile.findOne({ userId }),
    ]);
    if (!targetConsent || !targetConsent.isComplete)
      return res.status(404).json({ error: 'Profile not found.' });

    const viewerConsent = await ConsentProfile.findOne({ userId: currentUserId });

    const targetInterests = targetConsent.interests ?? [];
    const viewerInterests = viewerConsent?.interests ?? [];
    const viewerLimits    = viewerConsent?.limits    ?? [];

    const compatibilityScore = calculateCompatibilityScore(viewerInterests, targetInterests);
    const limitConflicts     = detectLimitConflicts(viewerLimits, targetInterests);
    const sharedInterests    = viewerInterests.filter(t => new Set(targetInterests).has(t));

    const connection    = await LoomConnection.getConnection(currentUserId, userId);
    const connectionTier = connection ? connection.tier : 'none';

    const [sentHandshake, receivedHandshake, cooldownHandshake] = await Promise.all([
      Handshake.findOne({ initiatorId: currentUserId, recipientId: userId, status: { $in: ['pending', 'accepted'] } }),
      Handshake.findOne({ initiatorId: userId, recipientId: currentUserId, status: 'pending' }),
      Handshake.findOne({ initiatorId: currentUserId, recipientId: userId, status: 'declined', cooldownUntil: { $gt: new Date() } }),
    ]);

    let handshakeStatus = 'none';
    let handshakeId     = null;
    let cooldownUntil   = null;

    if (connection || sentHandshake?.status === 'accepted') {
      handshakeStatus = 'accepted';
      handshakeId     = sentHandshake?._id ? String(sentHandshake._id) : null;
    } else if (sentHandshake?.status === 'pending') {
      handshakeStatus = 'pending_sent';
      handshakeId     = String(sentHandshake._id);
    } else if (receivedHandshake) {
      handshakeStatus = 'pending_received';
      handshakeId     = String(receivedHandshake._id);
    } else if (cooldownHandshake) {
      handshakeStatus = 'cooldown';
      cooldownUntil   = cooldownHandshake.cooldownUntil;
    }

    const vs = targetConsent.visibilitySettings || {};
    const canSee = (field) => {
      const s = vs[field] || 'public';
      if (s === 'public')    return true;
      if (s === 'connected') return connectionTier === 'connected' || connectionTier === 'trusted';
      if (s === 'trusted')   return connectionTier === 'trusted';
      return false;
    };

    res.json({
      userId,
      displayName:      canSee('displayName')       ? (targetUserProfile?.displayName || null) : null,
      city:             canSee('city')              ? (targetUserProfile?.city         || null) : null,
      pronouns:         targetUserProfile?.pronouns || null,
      bio:              connectionTier !== 'none'   ? (targetUserProfile?.bio           || null) : null,
      verificationTier: targetUserProfile?.verificationTier || 'unverified',
      memberSince:      targetConsent.createdAt,
      vouchCount:       0,
      experienceLevel:  canSee('experienceLevel')   ? targetConsent.experienceLevel : null,
      lookingFor:       canSee('lookingFor')         ? targetConsent.lookingFor      : [],
      interests:        canSee('interests')          ? targetInterests               : [],
      limits:           canSee('limits')             ? targetConsent.limits          : [],
      dynamicPreference:canSee('dynamicPreference')  ? targetConsent.dynamicPreference : [],
      compatibilityScore,
      limitConflicts,
      sharedInterests:  connectionTier !== 'none' ? sharedInterests : [],
      handshakeStatus,
      handshakeId,
      cooldownUntil,
      connectionTier,
      connectionId: connection ? String(connection._id) : null,
    });
  } catch (err) {
    console.error('public profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// Full profile only for connected users; limited profile otherwise
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -email -blockedUsers');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { viewerId } = req.query;
    if (viewerId) {
      const conn = await Connection.findOne({
        $or: [{ sender: viewerId, receiver: req.params.id }, { sender: req.params.id, receiver: viewerId }],
        status: 'approved',
      });
      if (conn) return res.json({ ...user.toObject(), connected: true });
    }
    res.json({ _id: user._id, gender: user.gender, description: user.description, tags: user.tags, connected: false });
  } catch { res.status(500).json({ error: 'Failed to fetch user' }); }
});

app.post('/api/users/:id/block', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.body.blockerId, { $addToSet: { blockedUsers: req.params.id } });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to block user' }); }
});

// ── Connections ───────────────────────────────────────────────────

app.get('/api/connections', async (req, res) => {
  try {
    const { userId } = req.query;
    const conns = await Connection.find({ $or: [{ sender: userId }, { receiver: userId }] })
      .populate('sender',   'username gender description tags')
      .populate('receiver', 'username gender description tags')
      .sort({ updatedAt: -1 });
    res.json(conns);
  } catch { res.status(500).json({ error: 'Failed to fetch connections' }); }
});

app.post('/api/connections', async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    if (!senderId || !receiverId || !message)
      return res.status(400).json({ error: 'All fields required' });
    const existing = await Connection.findOne({
      $or: [{ sender: senderId, receiver: receiverId }, { sender: receiverId, receiver: senderId }],
    });
    if (existing) return res.status(400).json({ error: 'Connection already exists' });
    const conn = await Connection.create({ sender: senderId, receiver: receiverId, message });
    const populated = await Connection.findById(conn._id)
      .populate('sender',   'username gender description tags')
      .populate('receiver', 'username gender description tags');
    io.to(`user_${receiverId}`).emit('new_connection_request', {
      connection: populated,
      notification: { type: 'connection_request', message: `${populated.sender.username} sent you a connection request`, meta: { connectionId: String(conn._id) } },
    });
    res.json(populated);
  } catch { res.status(500).json({ error: 'Failed to send request' }); }
});

app.put('/api/connections/:id/approve', async (req, res) => {
  try {
    const conn = await Connection.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true })
      .populate('sender',   'username gender description tags')
      .populate('receiver', 'username gender description tags');
    if (!conn) return res.status(404).json({ error: 'Not found' });
    io.to(`user_${conn.sender._id}`).emit('connection_approved', {
      connection: conn,
      notification: { type: 'connection_approved', message: `${conn.receiver.username} approved your connection request`, meta: { connectionId: String(conn._id) } },
    });
    res.json(conn);
  } catch { res.status(500).json({ error: 'Failed to approve' }); }
});

app.put('/api/connections/:id/reject', async (req, res) => {
  try {
    await Connection.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Failed to reject' }); }
});

// ── Rooms ─────────────────────────────────────────────────────────

app.get('/api/rooms', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
    const rooms = await Room.find(filter).sort({ createdAt: -1 }).limit(20);
    res.json(rooms);
  } catch { res.status(500).json({ error: 'Failed to fetch rooms' }); }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { name, description, createdBy } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Room name is required' });
    const room = await Room.create({ name: name.trim(), description: (description || '').trim(), createdBy });
    res.json(room);
  } catch (err) {
    if (err.code === 11000) res.status(400).json({ error: 'A room with that name already exists' });
    else res.status(500).json({ error: 'Failed to create room' });
  }
});

// ── Socket.io ─────────────────────────────────────────────────────

io.on('connection', (socket) => {
  socket.on('register_socket', (data) => {
    const userId = typeof data === 'string' ? data : data?.userId;
    if (!userId) return;
    socket.join(`user:${userId}`);
    socket.join(`user_${userId}`);
    socket.data.userId = userId;
    socket.emit('registered', { userId, socketId: socket.id });
  });

  socket.on('join_room', (room) => { socket.join(room); });
  socket.on('leave_room', (room) => { socket.leave(room); });

  socket.on('send_message', async ({ sender, content, room, roomName }) => {
    try {
      let recipientId = null;

      // Connection guard for Loom 1:1 rooms
      if (room && room.startsWith('conn_')) {
        const connectionId = room.slice(5);
        const conn = await LoomConnection.findById(connectionId);
        if (!conn || !conn.isActive) {
          socket.emit('message_error', 'You are not connected with this user.');
          return;
        }
        const otherUserId = conn.userAId === sender ? conn.userBId : conn.userAId;
        const blocked = await Block.findOne({
          $or: [
            { blockerId: sender,      blockedUserId: otherUserId },
            { blockerId: otherUserId, blockedUserId: sender      },
          ],
        });
        if (blocked) {
          socket.emit('message_error', 'You are not connected with this user.');
          return;
        }
        recipientId = otherUserId;
      }

      const message = await Message.create({ sender, content, room, recipientId });
      const conversationId = room.startsWith('conn_') ? room.slice(5) : room;
      const payload = {
        _id: message._id,
        sender,
        senderId: sender,
        content,
        time: message.createdAt,
        room,
        conversationId,
        roomName: roomName || room,
      };

      socket.to(room).emit('receive_message', payload);

      // Deliver to recipient's personal room if they're not actively in the chat
      if (recipientId) {
        const roomSockets = await io.in(room).fetchSockets();
        const recipientInRoom = roomSockets.some(s => s.data.userId === recipientId);
        if (!recipientInRoom) {
          io.to(`user:${recipientId}`).emit('receive_message', payload);
        }
      }
    } catch (err) {
      console.error('Failed to save message:', err);
      socket.emit('message_error', 'Failed to send message.');
    }
  });

  socket.on('typing',      ({ sender, room }) => { socket.to(room).emit('typing', sender); });
  socket.on('stop_typing', ({ room })         => { socket.to(room).emit('stop_typing'); });
  socket.on('disconnect',  () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
