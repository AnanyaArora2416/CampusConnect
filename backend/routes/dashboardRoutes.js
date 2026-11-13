const router = require('express').Router(),
  Assignment = require('../models/Assignment'),
  Submission = require('../models/Submission'),
  Event = require('../models/Event'),
  Registration = require('../models/EventRegistration'),
  User = require('../models/User'),
  v = require('../lib/utils'),
  { safe } = require('../controllers/assignmentController');
const { protect } = require('../middleware/authMiddleware');
router.get(
  '/',
  protect,
  v.run(async (req, res) => {
    const now = new Date(),
      role = req.user.role,
      filter = { deletedAt: null };
    if (role === 'student') filter.status = 'published';
    if (role === 'teacher') filter.createdBy = req.user._id;
    const own =
        role === 'student'
          ? await Submission.find({ student: req.user._id }).select('assignment').lean()
          : [],
      ids = own.map((s) => s.assignment),
      pending = { ...filter, _id: { $nin: ids } };
    const [assignments, drafts, published, upcomingEvents, deadlines] = await Promise.all([
      Assignment.countDocuments(filter),
      Assignment.countDocuments({ ...filter, status: 'draft' }),
      Assignment.countDocuments({ ...filter, status: 'published' }),
      Event.countDocuments({
        status: 'published',
        startsAt: { $gt: now },
        ...(role === 'teacher' ? { createdBy: req.user._id } : {}),
      }),
      Assignment.find({ ...(role === 'student' ? pending : filter), dueDate: { $gt: now } })
        .sort({ dueDate: 1 })
        .limit(5)
        .lean(),
    ]);
    const stats = { assignments, drafts, published, upcomingEvents };
    if (role === 'student') {
      stats.pending = await Assignment.countDocuments(pending);
      stats.overdue = await Assignment.countDocuments({ ...pending, dueDate: { $lt: now } });
      stats.submitted = await Assignment.countDocuments({ ...filter, _id: { $in: ids } });
      stats.completion = published ? Math.round((stats.submitted / published) * 100) : 0;
      const registrations = await Registration.find({ student: req.user._id })
        .populate('event', 'status startsAt')
        .lean();
      stats.registeredUpcoming = registrations.filter(
        (r) => r.event?.status === 'published' && r.event.startsAt > now,
      ).length;
    } else {
      const a = await Assignment.find(filter).select('_id').lean(),
        submissionFilter = { assignment: { $in: a.map((x) => x._id) } };
      stats.pendingReviews = await Submission.countDocuments({ ...submissionFilter, grade: null });
      stats.submissions = await Submission.countDocuments(submissionFilter);
      if (role === 'admin') {
        stats.users = await User.countDocuments();
        stats.teachers = await User.countDocuments({
          role: 'teacher',
          status: { $ne: 'disabled' },
        });
      }
    }
    const featuredEvent = await Event.findOne({ status: 'published', startsAt: { $gt: now } })
      .sort({ startsAt: 1 })
      .lean();
    res.json({
      stats,
      deadlines: deadlines.map(safe),
      featuredEvent,
      unavailable: [
        'attendance',
        'transcripts',
        'notifications',
        'Google sign-in',
        'email receipts',
      ],
    });
  }),
);
module.exports = router;
