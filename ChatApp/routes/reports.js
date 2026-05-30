/**
 * routes/reports.js
 * User reporting system, moderation queue, and block/unblock management.
 * Critical-severity reports trigger automatic suspension.
 */

const { Router }               = require('express');
const { requireAuth, getAuth } = require('../middleware/requireAuth');
const requireAdmin             = require('../middleware/requireAdmin');
const Report                   = require('../models/Report');
const Block                    = require('../models/Block');
const UserProfile              = require('../models/UserProfile');
const LoomConnection           = require('../models/LoomConnection');
const { logAuditEvent }        = require('../utils/auditLogger');

const router = Router();

// ── POST /api/reports ─────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { userId: reporterId } = getAuth(req);
    if (!reporterId) return res.status(401).json({ error: 'Unauthorized' });

    const { reportedUserId, contentType, contentId, category, detail } = req.body;

    if (reportedUserId === reporterId)
      return res.status(400).json({ error: 'You cannot report yourself.' });

    // Duplicate report gate: same reporter, same category, same user within 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await Report.findOne({
      reporterId, reportedUserId, category, createdAt: { $gt: oneDayAgo },
    });
    if (recent)
      return res.status(429).json({ error: 'You have already reported this user recently.' });

    const report = new Report({ reporterId, reportedUserId, contentType, contentId, category, detail });
    await report.save();

    // Auto-suspend critical severity
    if (report.severity === 'critical') {
      await UserProfile.findOneAndUpdate(
        { userId: reportedUserId },
        { isSuspendedPending: true },
        { upsert: true }
      );
      report.autoSuspended = true;
      await report.save();
    }

    logAuditEvent(reporterId, 'report_filed', {
      targetId: reportedUserId,
      metadata: { reportId: String(report._id), category: report.category, severity: report.severity },
      ip: req.ip,
    });

    const sla = report.severity === 'critical' ? '4 hours' : '24 hours';
    res.status(201).json({
      success:        true,
      reportId:       report._id,
      acknowledgedAt: new Date(),
      reviewSLA:      sla,
    });
  } catch (err) {
    console.error('report error:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

// ── GET /api/reports/admin — moderation queue ─────────────────────
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', severity, limit = 20 } = req.query;

    const severityOrder = { critical: 0, high: 1, standard: 2 };
    const filter = { status };
    if (severity) filter.severity = severity;

    let reports = await Report.find(filter).sort({ severity: -1, createdAt: 1 }).limit(Number(limit) + 1);

    reports.sort((a, b) => {
      const sa = severityOrder[a.severity] ?? 3;
      const sb = severityOrder[b.severity] ?? 3;
      if (sa !== sb) return sa - sb;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    let hasMore = false;
    if (reports.length > Number(limit)) {
      hasMore = true;
      reports = reports.slice(0, Number(limit));
    }

    const enriched = await Promise.all(reports.map(async r => {
      const [reporterProfile, reportedProfile] = await Promise.all([
        UserProfile.findOne({ userId: r.reporterId }),
        UserProfile.findOne({ userId: r.reportedUserId }),
      ]);
      return {
        ...r.toObject(),
        reporterDisplayName:  reporterProfile?.displayName  || r.reporterId,
        reportedDisplayName:  reportedProfile?.displayName  || r.reportedUserId,
        reportedIsBanned:     reportedProfile?.isBanned     || false,
        reportedWarningCount: reportedProfile?.warningCount || 0,
        autoSuspended:        reportedProfile?.isSuspendedPending || false,
      };
    }));

    res.json({ reports: enriched, hasMore });
  } catch (err) {
    console.error('admin reports error:', err);
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
});

// ── PATCH /api/reports/admin/:id — take action ────────────────────
router.patch('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { action, moderatorNotes } = req.body;
    const validActions = ['warn', 'suspend_7d', 'permanent_ban', 'dismissed'];
    if (!validActions.includes(action))
      return res.status(400).json({ error: 'Invalid action.' });

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found.' });

    const targetProfile = await UserProfile.findOne({ userId: report.reportedUserId });

    if (action === 'warn' && targetProfile) {
      targetProfile.warningCount = (targetProfile.warningCount || 0) + 1;
      await targetProfile.save();
    } else if (action === 'suspend_7d' && targetProfile) {
      targetProfile.suspendedUntil     = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      targetProfile.isSuspendedPending = false;
      await targetProfile.save();
    } else if (action === 'permanent_ban' && targetProfile) {
      targetProfile.isBanned           = true;
      targetProfile.isSuspendedPending = false;
      await targetProfile.save();
    }

    report.status          = action === 'dismissed' ? 'resolved_dismissed' : 'resolved_actioned';
    report.resolvedAt      = new Date();
    report.moderatorId     = req.adminUserId;
    report.moderatorAction = action;
    report.moderatorNotes  = moderatorNotes || '';
    await report.save();

    logAuditEvent(req.adminUserId || 'admin', 'report_resolved', {
      targetId: report.reportedUserId,
      metadata: { reportId: String(report._id), action, moderatorNotes: moderatorNotes || '' },
    });

    res.json({ success: true, report });
  } catch (err) {
    console.error('admin action error:', err);
    res.status(500).json({ error: 'Failed to apply action.' });
  }
});

// ── Block routes ──────────────────────────────────────────────────

// POST /api/reports/block
router.post('/block', async (req, res) => {
  try {
    const { userId: blockerId } = getAuth(req);
    if (!blockerId) return res.status(401).json({ error: 'Unauthorized' });

    const { blockedUserId } = req.body;
    if (!blockedUserId || blockedUserId === blockerId)
      return res.status(400).json({ error: 'Invalid request.' });

    await Block.findOneAndUpdate(
      { blockerId, blockedUserId },
      { blockerId, blockedUserId },
      { upsert: true, new: true }
    );

    // Deactivate any active connection
    await LoomConnection.updateMany(
      {
        $or: [
          { userAId: blockerId, userBId: blockedUserId },
          { userAId: blockedUserId, userBId: blockerId },
        ],
        isActive: true,
      },
      { $set: { isActive: false } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('block error:', err);
    res.status(500).json({ error: 'Failed to block user.' });
  }
});

// GET /api/reports/block
router.get('/block', async (req, res) => {
  try {
    const { userId: blockerId } = getAuth(req);
    if (!blockerId) return res.status(401).json({ error: 'Unauthorized' });

    const blocks = await Block.find({ blockerId }).sort({ createdAt: -1 });
    const enriched = await Promise.all(blocks.map(async b => {
      const profile = await UserProfile.findOne({ userId: b.blockedUserId });
      return {
        blockedUserId:          b.blockedUserId,
        blockedUserDisplayName: profile?.displayName || null,
        createdAt:              b.createdAt,
      };
    }));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch block list.' });
  }
});

// DELETE /api/reports/block/:blockedUserId
router.delete('/block/:blockedUserId', async (req, res) => {
  try {
    const { userId: blockerId } = getAuth(req);
    if (!blockerId) return res.status(401).json({ error: 'Unauthorized' });

    await Block.findOneAndDelete({ blockerId, blockedUserId: req.params.blockedUserId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove block.' });
  }
});

module.exports = router;
