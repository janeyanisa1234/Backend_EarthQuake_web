const express = require('express');
const router = express.Router();
const bot = require('../dbAPI/telegram');

// รับ webhook จาก Telegram
/*router.post('/webhook', (req, res) => {
  const { message } = req.body;
  if (message) {
    const chatId = message.chat.id;
    const text = message.text || '';
    bot.sendMessage(chatId, `คุณพิมพ์ว่า: ${text}`);
  }
  res.sendStatus(200);
});*/

router.get('/webhook', (req, res) => {
  res.send('Telegram Bot is running in polling mode');
});

module.exports = router;
