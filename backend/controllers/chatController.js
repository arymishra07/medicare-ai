const ChatMessage = require('../models/ChatMessage');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateReply } = require('../services/aiService');

const SUGGESTIONS = [
  'How can I manage a mild fever at home?',
  'What are some healthy ways to improve my sleep?',
  'When should I seek urgent care for a headache?',
  'How can I support healthy blood pressure?',
  'What should I know about antibiotic use?',
  'How much physical activity do I need each week?',
];

const getHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const messages = await ChatMessage.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json({
    success: true,
    data: {
      messages: messages.reverse(),
      suggestions: SUGGESTIONS,
      disclaimer:
        'MediCare AI provides general health information only. It does not diagnose conditions or prescribe medication. In an emergency, contact local emergency services.',
    },
  });
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = String(req.body.message || '').trim();
  if (!message) throw ApiError.badRequest('Please enter a message');
  if (message.length > 2000) throw ApiError.badRequest('Message is too long (maximum 2000 characters)');

  const previous = await ChatMessage.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const userMessage = await ChatMessage.create({
    user: req.user._id,
    role: 'user',
    content: message,
    category: 'general',
  });

  const reply = await generateReply(
    message,
    previous.reverse().map((item) => ({ role: item.role, content: item.content }))
  );

  const assistantMessage = await ChatMessage.create({
    user: req.user._id,
    role: 'assistant',
    content: reply.content,
    category: reply.category,
    flagged: reply.flagged,
  });

  res.status(201).json({
    success: true,
    data: { userMessage, assistantMessage },
  });
});

const clearHistory = asyncHandler(async (req, res) => {
  await ChatMessage.deleteMany({ user: req.user._id });
  res.json({ success: true, message: 'Chat history cleared' });
});

const getSuggestions = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { suggestions: SUGGESTIONS } });
});

module.exports = { getHistory, sendMessage, clearHistory, getSuggestions };
