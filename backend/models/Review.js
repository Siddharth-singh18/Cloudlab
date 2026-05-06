// backend/models/Review.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lineNumber: { type: Number, required: true },
  text: { type: String, required: true },
  resolved: { type: Boolean, default: false },
}, { timestamps: true });

const reviewSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  code: { type: String, required: true },
  modifiedCode: { type: String },
  language: { type: String, default: 'javascript' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  status: {
    type: String,
    enum: ['open', 'in_review', 'approved', 'changes_requested'],
    default: 'open'
  },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);