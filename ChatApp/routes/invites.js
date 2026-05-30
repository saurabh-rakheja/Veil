/**
 * routes/invites.js
 * Invite-code management — generate, list, validate, and redeem codes.
 * Free-tier users are capped at 5 unused codes at a time.
 */

const { Router }               = require('express');
const { requireAuth, getAuth } = require('../middleware/requireAuth');
const InviteCode               = require('../models/InviteCode');
const UserProfile              = require('../models/UserProfile');
const { generateInviteCode }   = require('../utils/generateInviteCode');
const { logAuditEvent }        = require('../utils/auditLogger');

const router = Router();
const FREE_TIER_LIMIT = 5;

// POST /api/invites/generate — auth required
router.post('/generate', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);

    const unusedCount = await InviteCode.countDocuments({
      createdByUserId: userId,
      isActive: true,
      usedByUserId: null,
    });
    if (unusedCount >= FREE_TIER_LIMIT) {
      return res.status(403).json({ error: 'You have reached your invite limit of 5 codes.' });
    }

    let code;
    let attempts = 0;
    do {
      code = generateInviteCode();
      attempts++;
    } while (await InviteCode.exists({ code }) && attempts < 20);

    const invite = await InviteCode.create({
      code,
      createdByUserId: userId,
      usedByUserId: null,
      usedAt: null,
      isActive: true,
      createdAt: new Date(),
    });

    res.status(201).json({ code: invite.code, createdAt: invite.createdAt });
  } catch (err) {
    console.error('[invites/generate] error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate invite code.' });
  }
});

// GET /api/invites/mine — auth required
router.get('/mine', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const codes = await InviteCode.find({ createdByUserId: userId }).sort({ createdAt: -1 });

    const enriched = await Promise.all(codes.map(async c => {
      let usedByDisplayName = null;
      if (c.usedByUserId) {
        const profile = await UserProfile.findOne({ userId: c.usedByUserId });
        usedByDisplayName = profile?.displayName || null;
      }
      return {
        _id:              c._id,
        code:             c.code,
        isActive:         c.isActive,
        usedByUserId:     c.usedByUserId,
        usedByDisplayName,
        usedAt:           c.usedAt,
        createdAt:        c.createdAt,
      };
    }));

    res.json({ codes: enriched });
  } catch (err) {
    console.error('[invites/mine] error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch invite codes.' });
  }
});

// POST /api/invites/validate — NO auth required (called before account exists)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || !code.trim()) {
      return res.json({ valid: false, error: 'Please enter an invite code.' });
    }

    const invite = await InviteCode.findOne({
      code:         code.trim().toUpperCase(),
      isActive:     true,
      usedByUserId: null,
    });

    if (!invite) {
      return res.json({ valid: false, error: 'Invalid or already used code.' });
    }

    res.json({ valid: true });
  } catch (err) {
    console.error('[invites/validate] error:', err);
    res.status(500).json({ error: err.message || 'Failed to validate code.' });
  }
});

// POST /api/invites/redeem — auth required (called immediately after account creation)
router.post('/redeem', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { code } = req.body;

    if (!code) return res.status(400).json({ error: 'Code is required.' });

    const invite = await InviteCode.findOneAndUpdate(
      { code: code.trim().toUpperCase(), isActive: true, usedByUserId: null },
      { $set: { usedByUserId: userId, usedAt: new Date(), isActive: false } },
      { new: true }
    );
    if (!invite) return res.status(400).json({ error: 'Code is invalid, already used, or expired.' });

    logAuditEvent(userId, 'invite_code_redeemed', {
      targetId: invite.createdByUserId,
      metadata: { code: invite.code },
      ip: req.ip,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('[invites/redeem] error:', err);
    res.status(500).json({ error: err.message || 'Failed to redeem invite code.' });
  }
});

module.exports = router;
