/**
 * routes/consentProfile.js
 * CRUD for a user's ConsentProfile — the onboarding data that drives discovery,
 * handshake eligibility, and compatibility scoring.
 */

const { Router } = require('express');
const { requireAuth, getAuth } = require('../middleware/requireAuth');
const ConsentProfile = require('../models/ConsentProfile');
const UserProfile    = require('../models/UserProfile');
const { logAuditEvent } = require('../utils/auditLogger');

const router = Router();

router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);

    const profile = await ConsentProfile.findOne({ userId }).lean();

    // Admin bypass — admins are never blocked by onboarding state
    const userProfile = await UserProfile.findOne({ userId }).lean();
    if (userProfile?.isAdmin === true) {
      if (!profile) {
        return res.json({
          exists: true,
          profile: {
            userId,
            isComplete: true,
            completedAt: new Date(),
            lookingFor: [],
            experienceLevel: null,
            interests: [],
            limits: [],
            visibilitySettings: {},
          },
        });
      }
      return res.json({ exists: true, profile: { ...profile, isComplete: true } });
    }

    if (!profile) {
      return res.json({ exists: false });
    }

    const isComplete = profile.isComplete === true;
    return res.json({ exists: true, profile: { ...profile, isComplete } });
  } catch (err) {
    console.error('[GET consent-profile]', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const existing = await ConsentProfile.findOne({ userId });
    if (existing) return res.status(409).json({ error: 'Profile already exists. Use PATCH to update.' });
    const profile = new ConsentProfile({ userId, ...req.body });
    await profile.save();
    res.status(201).json(profile);
  } catch {
    res.status(500).json({ error: 'Failed to create profile' });
  }
});

router.patch('/', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const update = { ...req.body, updatedAt: new Date() };
    // Always store isComplete as a proper boolean, never a string
    if (update.isComplete !== undefined) {
      update.isComplete = update.isComplete === true || update.isComplete === 'true';
    }
    const profile = await ConsentProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      { new: true, upsert: true, runValidators: false }
    );

    if (req.body.isComplete === true) {
      logAuditEvent(userId, 'onboarding_completed', { ip: req.ip });
    }

    res.json({ profile });
  } catch (err) {
    console.error('[consent-profile PATCH] error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
