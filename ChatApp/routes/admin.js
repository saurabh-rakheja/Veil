/**
 * routes/admin.js
 * Admin-only endpoints — login with JWT, user management, and report moderation.
 * All routes except /login are protected by the requireAdmin middleware.
 */

const { Router }   = require('express');
const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const requireAdmin = require('../middleware/requireAdmin');
const UserProfile  = require('../models/UserProfile');
const ConsentProfile = require('../models/ConsentProfile');
const Report       = require('../models/Report');

const router = Router();

// ── POST /api/admin/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password)
      return res.status(400).json({ error: 'userId and password are required.' });

    const profile = await UserProfile.findOne({ userId });
    if (!profile || !profile.isAdmin)
      return res.status(403).json({ error: 'Access denied.' });

    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash)
      return res.status(500).json({ error: 'Admin auth not configured.' });

    const valid = await bcrypt.compare(password, hash);
    if (!valid)
      return res.status(403).json({ error: 'Access denied.' });

    const token = jwt.sign(
      { userId, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h' }
    );

    res.json({ token, userId, displayName: profile.displayName });
  } catch (err) {
    console.error('admin login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { q, cursor, limit = 30 } = req.query;
    const filter = {};
    if (q) {
      filter.$or = [
        { displayName: { $regex: q, $options: 'i' } },
        { userId:      { $regex: q, $options: 'i' } },
      ];
    }
    if (cursor) filter._id = { $gt: cursor };

    const profiles = await UserProfile.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1);

    const hasMore = profiles.length > Number(limit);
    const results = hasMore ? profiles.slice(0, Number(limit)) : profiles;

    const enriched = await Promise.all(results.map(async p => {
      const reportCount = await Report.countDocuments({ reportedUserId: p.userId });
      return {
        userId:             p.userId,
        displayName:        p.displayName,
        city:               p.city,
        verificationTier:   p.verificationTier,
        joinDate:           p.createdAt,
        isBanned:           p.isBanned,
        isSuspendedPending: p.isSuspendedPending,
        suspendedUntil:     p.suspendedUntil,
        warningCount:       p.warningCount,
        isAdmin:            p.isAdmin,
        reportCount,
      };
    }));

    res.json({ users: enriched, hasMore, nextCursor: hasMore ? results[results.length - 1]._id : null });
  } catch (err) {
    console.error('admin users error:', err);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// ── GET /api/admin/users/:userId — full user detail ───────────────
router.get('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const [profile, consent] = await Promise.all([
      UserProfile.findOne({ userId }),
      ConsentProfile.findOne({ userId }),
    ]);
    if (!profile) return res.status(404).json({ error: 'User not found.' });

    const reportCount = await Report.countDocuments({ reportedUserId: userId });
    const reports     = await Report.find({ reportedUserId: userId }).sort({ createdAt: -1 }).limit(10);

    res.json({ profile, consent, reportCount, recentReports: reports });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user detail.' });
  }
});

module.exports = router;
