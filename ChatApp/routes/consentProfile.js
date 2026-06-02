/**
 * routes/consentProfile.js
 * CRUD for a user's ConsentProfile — the onboarding data that drives discovery,
 * handshake eligibility, and compatibility scoring.
 */

const { Router } = require('express');
const { clerkClient } = require('@clerk/express');
const { requireAuth, getAuth } = require('../middleware/requireAuth');
const ConsentProfile = require('../models/ConsentProfile');
const UserProfile    = require('../models/UserProfile');
const { logAuditEvent } = require('../utils/auditLogger');

const router = Router();

/**
 * Mark onboarding as complete in the user's Clerk publicMetadata. The route
 * guard reads this flag to decide whether to redirect into onboarding, so it
 * is the source of truth for "has this user finished onboarding".
 */
async function setOnboardingComplete(userId) {
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: { onboardingComplete: true },
  });
}

/**
 * Best-effort backfill: ensure a user whose onboarding is already complete
 * carries the publicMetadata flag, even if they finished onboarding before
 * this flag existed. Never throws — a failed backfill must not break reads.
 */
async function backfillOnboardingComplete(userId) {
  try {
    const user = await clerkClient.users.getUser(userId);
    if (user?.publicMetadata?.onboardingComplete !== true) {
      await setOnboardingComplete(userId);
    }
  } catch (err) {
    console.error('[consent-profile] onboarding metadata backfill failed:', err.message);
  }
}

router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);

    const profile = await ConsentProfile.findOne({ userId }).lean();

    // Admin bypass — admins are never blocked by onboarding state
    const userProfile = await UserProfile.findOne({ userId }).lean();
    if (userProfile?.isAdmin === true) {
      // Keep the guard's metadata source of truth in sync for admins too.
      await backfillOnboardingComplete(userId);
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
    // Backfill the publicMetadata flag for users who completed onboarding
    // before it was tracked in Clerk, so the guard lets them through.
    if (isComplete) await backfillOnboardingComplete(userId);
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
      // Record completion in Clerk publicMetadata — the route guard reads this
      // to decide redirects. Done here (server-side, with the Clerk secret key)
      // so it cannot be spoofed by the client. If this fails we surface a 500
      // so the client retries rather than landing in an onboarding loop.
      await setOnboardingComplete(userId);
    }

    res.json({ profile });
  } catch (err) {
    console.error('[consent-profile PATCH] error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
