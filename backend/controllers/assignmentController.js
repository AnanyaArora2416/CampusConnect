const Assignment = require('../models/Assignment'),
  Submission = require('../models/Submission'),
  v = require('../lib/utils'),
  files = require('../lib/files');
function validate(input, partial = false) {
  const b = v.body(input, [
      'title',
      'subject',
      'description',
      'dueDate',
      'maxMarks',
      'requirements',
      'resourceNotes',
      'status',
    ]),
    out = {};
  if (partial && !Object.keys(b).length) v.fail(400, 'Supply an update');
  for (const [k, max] of [
    ['title', 150],
    ['subject', 100],
    ['description', 5000],
  ])
    if (!partial || b[k] !== undefined) out[k] = v.text(b[k], k, max);
  if (!partial || b.dueDate !== undefined) out.dueDate = v.date(b.dueDate, 'Deadline', !partial);
  if (b.maxMarks !== undefined) out.maxMarks = v.number(b.maxMarks, 'Maximum marks', 1, 1000);
  if (b.status !== undefined) out.status = v.choice(b.status, 'status', ['draft', 'published']);
  if (b.resourceNotes !== undefined)
    out.resourceNotes = v.text(b.resourceNotes, 'Resource notes', 2000, 0);
  if (b.requirements !== undefined) {
    if (!Array.isArray(b.requirements) || b.requirements.length > 10)
      v.fail(400, 'Use at most 10 requirements');
    out.requirements = b.requirements.map((r) => {
      v.body(r, ['title', 'description']);
      return {
        title: v.text(r.title, 'Requirement title', 120),
        description: v.text(r.description, 'Requirement description', 1000),
      };
    });
  }
  return out;
}
async function visible(req) {
  v.id(req.params.id);
  const a = await Assignment.findOne({ _id: req.params.id, deletedAt: null });
  if (
    !a ||
    (req.user.role === 'student' && a.status !== 'published') ||
    (req.user.role === 'teacher' && !v.owner(req.user, a))
  )
    v.fail(404, 'Assignment not found');
  return a;
}
function safe(a) {
  const x = a.toObject ? a.toObject() : a;
  return {
    ...x,
    maxMarks: x.maxMarks ?? 100,
    requirements: x.requirements || [],
    resourceNotes: x.resourceNotes || '',
    resources: (x.resources || []).map(files.safe),
  };
}
function safeSubmission(s) {
  const x = s.toObject ? s.toObject() : s;
  return { ...x, file: files.safe(x.file) };
}
async function createAssignment(req, res) {
  const a = await Assignment.create({ ...validate(req.body), createdBy: req.user._id });
  res.status(201).json({ message: 'Assignment saved', assignment: safe(a) });
}
async function getAssignments(req, res) {
  const filter = { deletedAt: null };
  if (req.user.role === 'student') filter.status = 'published';
  if (req.user.role === 'teacher') filter.createdBy = req.user._id;
  if (req.query.status && req.user.role !== 'student')
    filter.status = v.choice(req.query.status, 'status', ['draft', 'published']);
  const q = v.search(req.query.q);
  if (q)
    filter.$or = ['title', 'subject', 'description'].map((k) => ({
      [k]: { $regex: q, $options: 'i' },
    }));
  const { page, limit, skip } = v.pagination(req.query),
    sort =
      req.query.sort === 'title'
        ? { title: 1 }
        : req.query.sort === 'due-desc'
          ? { dueDate: -1 }
          : { dueDate: 1 };
  const [items, total] = await Promise.all([
    Assignment.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Assignment.countDocuments(filter),
  ]);
  const submissions =
      req.user.role === 'student'
        ? await Submission.find({
            student: req.user._id,
            assignment: { $in: items.map((a) => a._id) },
          }).lean()
        : [],
    map = new Map(submissions.map((s) => [String(s.assignment), safeSubmission(s)]));
  res.json({
    assignments: items.map((a) => ({ ...safe(a), submission: map.get(String(a._id)) || null })),
    total,
    count: items.length,
    page,
    pages: Math.ceil(total / limit),
  });
}
async function updateAssignment(req, res) {
  const a = await visible(req);
  if (!v.owner(req.user, a)) v.fail(403, 'Only the owner can edit');
  const updates = validate(req.body, true);
  if (
    updates.dueDate &&
    updates.dueDate.getTime() !== a.dueDate.getTime() &&
    updates.dueDate <= new Date()
  )
    v.fail(400, 'Changed deadlines must be in the future');
  if (
    updates.maxMarks !== undefined &&
    (await Submission.exists({ assignment: a._id, grade: { $gt: updates.maxMarks } }))
  )
    v.fail(409, 'Maximum marks cannot be lower than an existing grade');
  Object.assign(a, updates);
  await a.save();
  res.json({ message: 'Assignment updated', assignment: safe(a) });
}
async function deleteAssignment(req, res) {
  const a = await visible(req);
  if (!v.owner(req.user, a)) v.fail(403, 'Only the owner can archive');
  a.deletedAt = new Date();
  await a.save();
  res.json({ message: 'Assignment archived' });
}
module.exports = {
  visible,
  safe,
  safeSubmission,
  createAssignment,
  getAssignments,
  updateAssignment,
  deleteAssignment,
};
