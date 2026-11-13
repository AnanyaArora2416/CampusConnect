const mongoose = require('mongoose');
const schema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    file: { name: String, storedName: String, size: Number, mime: String },
    submittedAt: { type: Date, required: true },
    late: { type: Boolean, required: true },
    grade: { type: Number, default: null },
    feedback: { type: String, default: '', maxlength: 2000 },
    gradedAt: { type: Date, default: null },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);
schema.index({ assignment: 1, student: 1 }, { unique: true });
schema.index({ student: 1, submittedAt: -1 });
module.exports = mongoose.model('Submission', schema);
