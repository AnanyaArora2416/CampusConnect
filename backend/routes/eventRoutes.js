const router = require('express').Router(),
  mongoose = require('mongoose'),
  v = require('../lib/utils'),
  Event = require('../models/Event'),
  Registration = require('../models/EventRegistration');
const { protect } = require('../middleware/authMiddleware'),
  { authorize } = require('../middleware/roleMiddleware');
async function visible(req) {
  v.id(req.params.id);
  const e = await Event.findById(req.params.id);
  if (!e || (e.status === 'draft' && !v.owner(req.user, e))) v.fail(404, 'Event not found');
  return e;
}
function validate(input, partial = false) {
  const b = v.body(input, [
      'title',
      'description',
      'category',
      'location',
      'startsAt',
      'endsAt',
      'capacity',
      'status',
    ]),
    out = {};
  if (partial && !Object.keys(b).length) v.fail(400, 'Supply an update');
  for (const [k, max] of [
    ['title', 150],
    ['description', 5000],
    ['location', 200],
  ])
    if (!partial || b[k] !== undefined) out[k] = v.text(b[k], k, max);
  if (!partial || b.category !== undefined)
    out.category = v.choice(b.category, 'category', [
      'Technology',
      'Workshop',
      'Cultural',
      'Sports',
      'Other',
    ]);
  for (const k of ['startsAt', 'endsAt'])
    if (!partial || b[k] !== undefined) out[k] = v.date(b[k], k, !partial);
  if (!partial || b.capacity !== undefined)
    out.capacity = v.number(b.capacity, 'Capacity', 1, 100000, true);
  if (b.status !== undefined)
    out.status = v.choice(b.status, 'status', ['draft', 'published', 'cancelled']);
  return out;
}
router.use(protect);
router.get(
  '/mine',
  authorize('student'),
  v.run(async (req, res) => {
    const { page, limit, skip } = v.pagination(req.query),
      filter = { student: req.user._id };
    const [registrations, total] = await Promise.all([
      Registration.find(filter)
        .populate('event')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Registration.countDocuments(filter),
    ]);
    res.json({ registrations, total, page, pages: Math.ceil(total / limit) });
  }),
);
router.get(
  '/',
  v.run(async (req, res) => {
    let filter =
      req.user.role === 'admin'
        ? {}
        : { $or: [{ status: { $in: ['published', 'cancelled'] } }, { createdBy: req.user._id }] };
    if (req.query.own === 'true' && req.user.role !== 'student') filter.createdBy = req.user._id;
    if (req.query.category)
      filter.category = v.choice(req.query.category, 'category', [
        'Technology',
        'Workshop',
        'Cultural',
        'Sports',
        'Other',
      ]);
    if (req.query.upcoming === 'true') {
      filter.status = 'published';
      filter.startsAt = { $gt: new Date() };
    }
    const q = v.search(req.query.q);
    if (q)
      filter = {
        $and: [
          filter,
          {
            $or: ['title', 'location', 'description'].map((k) => ({
              [k]: { $regex: q, $options: 'i' },
            })),
          },
        ],
      };
    const { page, limit, skip } = v.pagination(req.query),
      [events, total] = await Promise.all([
        Event.find(filter).sort({ startsAt: 1 }).skip(skip).limit(limit).lean(),
        Event.countDocuments(filter),
      ]);
    const mine =
        req.user.role === 'student'
          ? await Registration.find({
              student: req.user._id,
              event: { $in: events.map((e) => e._id) },
            }).lean()
          : [],
      ids = new Set(mine.map((r) => String(r.event)));
    res.json({
      events: events.map((e) => ({ ...e, registered: ids.has(String(e._id)) })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  }),
);
router.post(
  '/',
  authorize('teacher', 'admin'),
  v.run(async (req, res) => {
    const b = validate(req.body);
    if (b.endsAt <= b.startsAt) v.fail(400, 'Event must end after it starts');
    res.status(201).json({ event: await Event.create({ ...b, createdBy: req.user._id }) });
  }),
);
router.get(
  '/:id',
  v.run(async (req, res) => {
    const e = await visible(req),
      registered = !!(await Registration.exists({ event: e._id, student: req.user._id }));
    res.json({ event: { ...e.toObject(), registered } });
  }),
);
router.put(
  '/:id',
  authorize('teacher', 'admin'),
  v.run(async (req, res) => {
    const e = await visible(req);
    if (!v.owner(req.user, e)) v.fail(403, 'Only the organizer can edit this event');
    if (e.status === 'cancelled') v.fail(409, 'Cancelled events cannot be edited');
    const updates = validate(req.body, true);
    for (const k of ['startsAt', 'endsAt'])
      if (updates[k] && updates[k].getTime() !== e[k].getTime() && updates[k] <= new Date())
        v.fail(400, 'Changed dates must be in the future');
    if ((updates.endsAt || e.endsAt) <= (updates.startsAt || e.startsAt))
      v.fail(400, 'Event must end after it starts');
    if (e.registrationCount && updates.status === 'draft')
      v.fail(409, 'An event with registrations cannot return to draft');
    const filter = { _id: e._id, status: e.status };
    if (updates.capacity !== undefined) filter.registrationCount = { $lte: updates.capacity };
    if (updates.status === 'draft') filter.registrationCount = 0;
    const event = await Event.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!event)
      v.fail(409, 'Event changed or capacity is below the current count. Refresh and retry.');
    res.json({ event });
  }),
);
router.post(
  '/:id/register',
  authorize('student'),
  v.run(async (req, res) => {
    v.id(req.params.id);
    await mongoose.connection.transaction(async (session) => {
      if (
        await Registration.exists({ event: req.params.id, student: req.user._id }).session(session)
      )
        v.fail(409, 'You are already registered');
      const e = await Event.findOneAndUpdate(
        {
          _id: req.params.id,
          status: 'published',
          startsAt: { $gt: new Date() },
          $expr: { $lt: ['$registrationCount', '$capacity'] },
        },
        { $inc: { registrationCount: 1 } },
        { new: true, session },
      );
      if (!e) v.fail(409, 'Event is full, unavailable or registration has closed');
      await Registration.create([{ event: e._id, student: req.user._id }], { session });
    });
    res.status(201).json({ message: 'Registration saved' });
  }),
);
router.delete(
  '/:id/register',
  authorize('student'),
  v.run(async (req, res) => {
    v.id(req.params.id);
    await mongoose.connection.transaction(async (session) => {
      const e = await Event.findById(req.params.id).session(session);
      if (!e) v.fail(404, 'Event not found');
      if (e.startsAt <= new Date() && e.status !== 'cancelled')
        v.fail(409, 'Cancellation closes when the event starts');
      const r = await Registration.findOneAndDelete(
        { event: e._id, student: req.user._id },
        { session },
      );
      if (!r) v.fail(404, 'Registration not found');
      await Event.updateOne(
        { _id: e._id, registrationCount: { $gt: 0 } },
        { $inc: { registrationCount: -1 } },
        { session },
      );
    });
    res.json({ message: 'Registration cancelled' });
  }),
);
router.get(
  '/:id/registrations',
  authorize('teacher', 'admin'),
  v.run(async (req, res) => {
    const e = await visible(req);
    if (!v.owner(req.user, e)) v.fail(403, 'Only the organizer can view attendees');
    const { page, limit, skip } = v.pagination(req.query),
      filter = { event: e._id };
    const [registrations, total] = await Promise.all([
      Registration.find(filter)
        .populate('student', 'name email')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Registration.countDocuments(filter),
    ]);
    res.json({ registrations, total, page, pages: Math.ceil(total / limit) });
  }),
);
module.exports = router;
