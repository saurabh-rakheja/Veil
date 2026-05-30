/**
 * routes/discovery.js
 * Returns paginated discovery cards — consent profiles visible to the
 * requesting user, sorted by compatibility score and filtered by query params.
 */

const { Router } = require('express');
const mongoose   = require('mongoose');
const { requireAuth, getAuth } = require('../middleware/requireAuth');
const ConsentProfile = require('../models/ConsentProfile');
const UserProfile    = require('../models/UserProfile');
const LoomConnection = require('../models/LoomConnection');
const { calculateCompatibilityScore, detectLimitConflicts } = require('../utils/compatibility');

const router = Router();

router.get('/', requireAuth(), async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const {
      city,
      experienceLevel,
      lookingFor,
      minCompatibility,
      cursor,
      limit = 20,
    } = req.query;

    const requestingProfile = await ConsentProfile.findOne({ userId }).lean()
      || { interests: [], limits: [] };

    const existingConns = await LoomConnection.find({
      $or: [{ userAId: userId }, { userBId: userId }],
      isActive: true,
    }).lean();
    const connectedUserIds = existingConns.map(c =>
      c.userAId === userId ? c.userBId : c.userAId
    );

    const profileQuery = {
      isComplete: true,
      userId: { $nin: [userId, ...connectedUserIds] },
    };

    if (cursor) {
      try {
        profileQuery._id = { $lt: new mongoose.Types.ObjectId(cursor) };
      } catch (e) {
        // invalid cursor — ignore
      }
    }

    if (experienceLevel) profileQuery.experienceLevel = experienceLevel;

    if (lookingFor) {
      const arr = lookingFor.split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) profileQuery.lookingFor = { $in: arr };
    }

    const pageSize = Math.min(parseInt(limit) || 20, 50);

    const profiles = await ConsentProfile
      .find(profileQuery)
      .sort({ _id: -1 })
      .limit(pageSize + 1)
      .lean();

    const hasMore = profiles.length > pageSize;
    const pageProfiles = hasMore ? profiles.slice(0, pageSize) : profiles;

    const userIds = pageProfiles.map(p => p.userId);
    const upDocs  = await UserProfile.find({ userId: { $in: userIds } }).lean();
    const upMap   = {};
    upDocs.forEach(u => { upMap[u.userId] = u; });

    let cards = pageProfiles.map(profile => {
      const up  = upMap[profile.userId] || {};
      const vis = profile.visibilitySettings || {};

      const compatibilityScore = calculateCompatibilityScore(
        requestingProfile.interests || [],
        profile.interests || []
      );
      const limitConflicts = detectLimitConflicts(
        requestingProfile.limits || [],
        profile.interests || []
      );

      const showCity  = vis.city  !== 'trusted';
      const showExpLv = vis.experienceLevel !== 'trusted';
      const showLF    = vis.lookingFor      !== 'trusted';

      return {
        userId:           profile.userId,
        displayName:      up.displayName || '',
        city:             showCity  ? (up.city || '') : '',
        experienceLevel:  showExpLv ? (profile.experienceLevel || null) : null,
        lookingFor:       showLF    ? (profile.lookingFor || []) : [],
        verificationTier: up.verificationTier || 'unverified',
        memberSince:      profile.createdAt,
        vouchCount:       0,
        compatibilityScore,
        limitConflicts,
        hasProfilePhoto:  !!up.profilePhoto,
      };
    });

    if (city) {
      const q = city.toLowerCase();
      cards = cards.filter(c => c.city.toLowerCase().includes(q));
    }

    if (minCompatibility) {
      cards = cards.filter(c => c.compatibilityScore >= parseInt(minCompatibility));
    }

    cards.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    const nextCursor = hasMore
      ? pageProfiles[pageProfiles.length - 1]._id.toString()
      : null;

    res.json({ cards, hasMore, nextCursor });
  } catch (err) {
    console.error('[discovery] error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
