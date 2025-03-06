const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ban = require('../models/Ban');
const Message = require('../models/Message');

// Получить профиль пользователя
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Создать/обновить профиль
router.post('/profile', async (req, res) => {
  try {
    const { userId, ...profileData } = req.body;
    const user = await User.findOneAndUpdate(
      { userId },
      profileData,
      { upsert: true, new: true }
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Поиск профилей
router.get('/search/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user || await checkBan(user.userId)) return res.json([]);

    const minRating = Math.max(1, user.rating - 2);
    const maxRating = Math.min(10, user.rating + 2);
    const minAge = user.age - 2;
    const maxAge = user.age + 2;

    const profiles = await User.find({
      userId: { $ne: user.userId },
      isActive: true,
      gender: user.searchGender,
      city: user.city,
      age: { $gte: minAge, $lte: maxAge },
      rating: { $gte: minRating, $lte: maxRating }
    });

    res.json(profiles.filter(p => !checkBan(p.userId)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Лайк/дизлайк
router.post('/rate', async (req, res) => {
  try {
    const { userId, targetId, action } = req.body;
    const target = await User.findOne({ userId: targetId });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const change = action === 'like' ? 0.1 : -0.1;
    target.rating = Math.max(0, Math.min(10, target.rating + change));
    target.ratedBy += 1;
    target.viewedBy.set(userId, 1);
    await target.save();

    res.json(target);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отправить сообщение
router.post('/message', async (req, res) => {
  try {
    const message = new Message(req.body);
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Получить сообщения
router.get('/messages/:userId/:targetId', async (req, res) => {
  try {
    const { userId, targetId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: userId, targetId },
        { senderId: targetId, targetId: userId }
      ]
    }).sort('timestamp');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Проверить бан
async function checkBan(userId) {
  const ban = await Ban.findOne({ userId });
  if (!ban) return false;
  if (new Date(ban.until) > new Date()) return true;
  await Ban.deleteOne({ userId });
  return false;
}

module.exports = router;