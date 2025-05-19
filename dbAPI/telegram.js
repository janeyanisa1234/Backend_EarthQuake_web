const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// เก็บสถานะของผู้ใช้ (เช่น รอรับชื่อเมือง)
const userStates = {};

// Mock data สำหรับแผ่นดินไหว
const mockEarthquakeData = [
  {
    location: 'กรุงเทพมหานคร',
    magnitude: 5.2,
    time: '2025-05-19 10:00:00',
    depth: '10 กม.',
  },
  {
    location: 'เชียงใหม่',
    magnitude: 4.8,
    time: '2025-05-18 15:30:00',
    depth: '8 กม.',
  },
];

// Mock data สำหรับเมือง
const mockCityData = [
  { name: 'กรุงเทพมหานคร', lat: 13.7563, lon: 100.5018 },
  { name: 'เชียงใหม่', lat: 18.7883, lon: 98.9853 },
  { name: 'ภูเก็ต', lat: 7.8804, lon: 98.3923 },
  { name: 'ขอนแก่น', lat: 16.4322, lon: 102.8365 },
];

// ฟังก์ชันส่งเมนูหลักด้วย Inline Keyboard
const sendMainMenu = (chatId) => {
  const menuOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '📍 ข้อมูลแผ่นดินไหวล่าสุด', callback_data: 'latest_earthquake' },
          { text: '🌆 ข้อมูลเมืองใกล้แผ่นดินไหว', callback_data: 'find_city' },
        ],
        [
          { text: '🛡️ ข้อมูลความปลอดภัย', callback_data: 'safety_info' },
          { text: '📞 เกี่ยวกับฉัน', callback_data: 'support' },
        ],
      ],
    },
    parse_mode: 'Markdown',
  };
  bot.sendMessage(
    chatId,
    '*🌍 Earthquake Bot*\nเลือกบริการที่ต้องการจากเมนูด้านล่าง:',
    menuOptions
  );
};

// เมื่อผู้ใช้เริ่มแชทหรือใช้คำสั่ง /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    '*ยินดีต้อนรับสู่ Earthquake Bot! 🌍*\nบอทนี้ช่วยให้คุณทราบข้อมูลเกี่ยวกับแผ่นดินไหวและความปลอดภัย\n\n*เริ่มต้นโดยเลือกตัวเลือกจากเมนู!*',
    { parse_mode: 'Markdown' }
  );
  sendMainMenu(chatId);
});

// เมื่อผู้ใช้ใช้คำสั่ง /menu
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  sendMainMenu(chatId);
});

// จัดการการกดปุ่ม Inline Keyboard
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  switch (data) {
    case 'latest_earthquake':
      const latest = mockEarthquakeData[0];
      bot.sendMessage(
        chatId,
        `*📍 ข้อมูลแผ่นดินไหวล่าสุด*\n- *สถานที่*: ${latest.location}\n- *ขนาด*: ${latest.magnitude} ริกเตอร์\n- *เวลา*: ${latest.time}\n- *ความลึก*: ${latest.depth}`,
        { parse_mode: 'Markdown' }
      );
      break;
    case 'find_city':
      userStates[chatId] = 'waiting_for_city';
      bot.sendMessage(
        chatId,
        '*🌆 ข้อมูลเมืองใกล้แผ่นดินไหว*\nกรุณาพิมพ์ชื่อเมือง (เช่น กรุงเทพมหานคร, เชียงใหม่):',
        { parse_mode: 'Markdown' }
      );
      break;
    case 'safety_info':
      bot.sendMessage(
        chatId,
        `*🛡️ ข้อมูลความปลอดภัย*\n- 🚪 หลบใต้โต๊ะหรือที่แข็งแรง\n- 🪟 อยู่ห่างจากหน้าต่างและของหนัก\n- 🏃 อพยพเมื่อปลอดภัย`,
        { parse_mode: 'Markdown' }
      );
      break;
    case 'support':
      bot.sendMessage(
        chatId,
        `*📞 เกี่ยวกับฉัน*\n- 📧 อีเมล: support@earthquakebot.com\n- 📱 โทร: 123-456-7890`,
        { parse_mode: 'Markdown' }
      );
      break;
  }
  bot.answerCallbackQuery(query.id); // ยืนยันการกดปุ่ม
});

// จัดการข้อความจากผู้ใช้ (สำหรับการพิมพ์)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // ข้ามคำสั่งที่จัดการแล้ว
  if (text.startsWith('/')) return;

  // ตรวจสอบสถานะของผู้ใช้
  if (userStates[chatId] === 'waiting_for_city') {
    const city = mockCityData.find((c) => c.name.toLowerCase() === text.toLowerCase());
    if (city) {
      bot.sendMessage(
        chatId,
        `*🌆 ผลการค้นหาเมือง*\n- *เมือง*: ${city.name}\n- *พิกัด*: (${city.lat}, ${city.lon})\n- *ข้อมูล*: อยู่ใกล้จุดแผ่นดินไหวล่าสุดที่ ${mockEarthquakeData[0].location}`,
        { parse_mode: 'Markdown' }
      );
      delete userStates[chatId]; // ล้างสถานะ
      sendMainMenu(chatId);
    } else {
      bot.sendMessage(
        chatId,
        '*⚠️ ไม่พบเมืองที่ระบุ*\nกรุณาพิมพ์ชื่อเมืองให้ถูกต้อง (เช่น กรุงเทพมหานคร, เชียงใหม่)',
        { parse_mode: 'Markdown' }
      );
    }
    return;
  }

  // กรณีข้อความไม่ตรงกับเมนู
  bot.sendMessage(
    chatId,
    '*⚠️ ไม่พบคำสั่งที่ต้องการ*\nกรุณาเลือกจากเมนูด้านล่าง:',
    { parse_mode: 'Markdown' }
  );
  sendMainMenu(chatId);
});

module.exports = bot;