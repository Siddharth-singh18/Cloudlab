const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const Review = require('../models/Review');
const User = require('../models/User');
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.post('/', auth, authorize(['developer']), async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, owner: req.user._id });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  let query = {};
  if (req.user.role === 'developer') {
    query = { owner: req.user._id };
  }
  const reviews = await Review.find(query)
    .populate('owner', 'name email')
    .sort({ createdAt: -1 });
  res.json(reviews);
});

router.get('/:id', auth, async (req, res) => {
  const review = await Review.findById(req.params.id)
    .populate('owner', 'name email')
    .populate('comments.author', 'name email');
  if (!review) return res.status(404).json({ message: 'Not found' });
  res.json(review);
});

router.post('/:id/comments', auth, async (req, res) => {
  const review = await Review.findById(req.params.id);
  review.comments.push({ ...req.body, author: req.user._id });
  await review.save();
  const updated = await Review.findById(req.params.id).populate('comments.author', 'name email');
  res.json(updated.comments[updated.comments.length - 1]);
});

router.post('/:id/ai-review', auth, authorize(['reviewer', 'admin']), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    let aiUser = await User.findOne({ email: 'ai@devcollab.com' });
    if (!aiUser) {
      aiUser = await User.create({ name: 'Gemini AI ✨', email: 'ai@devcollab.com', password: 'no_login_allowed', role: 'reviewer' });
    }

    let parsedComments = [];
    let summary = '';

    if (process.env.GEMINI_API_KEY) {
      const models = ['gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-flash-latest'];
      for (const modelName of models) {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: modelName });
          const prompt = `You are an expert ${review.language} code reviewer. Analyze this code thoroughly and return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence overall assessment of the code quality, what it does, and main concerns",
  "comments": [
    {"lineNumber": <line number as integer>, "text": "<specific actionable feedback for that line>"},
    ...
  ]
}

Rules:
- Find 3-5 specific issues (bugs, performance, security, style)
- Each comment must point to a real line number in the code
- Be specific and actionable, not generic
- Return ONLY raw JSON, no markdown, no explanation

Code to review (${review.language}):
\`\`\`
${review.code}
\`\`\``;
          
          const result = await model.generateContent(prompt);
          const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(responseText);
          parsedComments = parsed.comments || [];
          summary = parsed.summary || '';
          console.log(`AI Review success with model: ${modelName}`);
          break; // success, stop trying
        } catch (aiErr) {
          console.error(`Model ${modelName} failed:`, aiErr.message?.substring(0, 100));
          if (!aiErr.message?.includes('429') && !aiErr.message?.includes('quota')) {
            break; // Non-rate-limit error, don't retry
          }
        }
      }
    }
    
    if (!parsedComments || parsedComments.length === 0) {
      parsedComments = [
        { lineNumber: 1, text: "Consider adding documentation/comments at the start of the file. (Mock AI - Add GEMINI_API_KEY to .env for real insights)" },
        { lineNumber: Math.max(1, Math.floor(review.code.split('\n').length / 2)), text: "Ensure this block handles edge cases and null values properly. (Mock AI Response)" }
      ];
      summary = "Mock AI Response: Add a valid GEMINI_API_KEY to backend .env for real Gemini insights.";
    }

    const savedComments = [];
    for (const c of parsedComments) {
      review.comments.push({ author: aiUser._id, lineNumber: c.lineNumber, text: `🤖 ${c.text}` });
      await review.save();
      const updated = await Review.findById(req.params.id).populate('comments.author', 'name email avatar');
      savedComments.push(updated.comments[updated.comments.length - 1]);
    }

    res.json({ comments: savedComments, summary });
  } catch (err) {
    console.error('AI Review Error:', err);
    res.status(500).json({ message: 'Failed to generate AI review: ' + err.message });
  }
});

router.patch('/:id/status', auth, authorize(['developer', 'reviewer', 'admin']), async (req, res) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id, { status: req.body.status }, { new: true }
  );
  res.json(review);
});

router.patch('/:id/code', auth, authorize(['developer', 'reviewer', 'admin']), async (req, res) => {
  const updateData = { modifiedCode: req.body.modifiedCode };
  if (req.body.code) updateData.code = req.body.code;
  const review = await Review.findByIdAndUpdate(
    req.params.id, updateData, { new: true }
  );
  res.json(review);
});

router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
  await Review.findByIdAndDelete(req.params.id);
  res.json({ message: 'Review deleted successfully' });
});

module.exports = router;