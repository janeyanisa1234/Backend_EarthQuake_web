/*const mysql = require('mysql2/promise');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ข้อความสนทนาแบบสุ่มสำหรับการโต้ตอบทั่วไป
const generalResponses = {
  greetings: [
    'สวัสดีครับ! ดีใจที่ได้คุยกับคุณ ',
    'สวัสดีจ้า! ผมพร้อมช่วยคุณเกี่ยวกับแผ่นดินไหว 🌍 ลองเลือกเมนูดูนะ!',
    'ยินดีต้อนรับ! มีอะไรให้ช่วยเกี่ยวกับแผ่นดินไหวบ้างไหม?',
  ],
  questions: [
    'น่าสนใจนะครับ! แต่ผมเชี่ยวชาญเรื่องแผ่นดินไหว ลองถามเกี่ยวกับเรื่องนั้นได้นะ 😄',
    'ดูเหมือนคุณจะสงสัยอะไรสักอย่าง ผมช่วยเรื่องแผ่นดินไหวได้ ลองบอกมา!',
    'ผมเป็นบอทเกี่ยวกับแผ่นดินไหวครับ ถ้ามีคำถามอื่น ลองใช้เมนูดูนะ!',
  ],
  default: [
    'เอ๋? ผมไม่เข้าใจเท่าไหร่ 😅 ลองเลือกจากเมนู หรือถามเกี่ยวกับแผบอทได้นะ!',
    'อืม... ผมอาจจะตอบไม่ถูก ถ้าอยากรู้เรื่องแผ่นดินไหว ลองใช้เมนูสิ!',
    'ขอโทษนะครับ ผมยังไม่ฉลาดขนาดนั้น 😄 ลองเลือกเมนูดูได้!',
  ],
};

// ฟังก์ชันสุ่มข้อความจาก array
const getRandomResponse = (category) => {
  const responses = generalResponses[category] || generalResponses.default;
  return responses[Math.floor(Math.random() * responses.length)];
};

// คำอธิบายระดับความเสี่ยง
const riskLevelDescriptions = {
  Severe: 'รุนแรงมาก: มีโอกาสเกิดความเสียหายร้ายแรงต่ออาคารและโครงสร้าง',
  'Very High': 'สูงมาก: มีความเสี่ยงสูงต่อความเสียหาย, ควรอพยพจากตึกสูงทันที',
  High: 'สูง: มีโอกาสเกิดความเสียหายปานกลางถึงสูง, ควรระวังอย่างมาก',
  Moderate: 'ปานกลาง: อาจเกิดความเสียหายเล็กน้อย, เฝ้าระวังอย่างใกล้ชิด',
  Light: 'ต่ำ: ความเสี่ยงต่ำ, แต่ควรเตรียมพร้อมรับสถานการณ์',
};

// เชื่อมต่อ MySQL
async function createConnection() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'earthquake'
  });
  console.log('Connected to MySQL database: earthquake');
  return connection;
}

// ฟังก์ชันส่งเมนูหลักด้วย Inline Keyboard
const sendMainMenu = (chatId) => {
  const menuOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🌎 ข้อมูลแผ่นดินไหวล่าสุด', callback_data: 'latest_earthquake' },
          { text: '🏡 ข้อมูลพื้นที่เสี่ยงแผ่นดินไหว', callback_data: 'find_city' },
        ],
        [
          { text: '🐻‍❄️ แนวทางการรับมือแผ่นดินไหว', callback_data: 'safety_info' },
          { text: '🤗 ข้อมูลเพิ่มเติมเกี่ยวกับฉัน', callback_data: 'support' },
        ],
      ],
    },
    parse_mode: 'Markdown',
  };
  bot.sendMessage(
    chatId,
    '*🌍 สวัสดีจ้า  ยินดีต้อนรับสู่ \nEarthquake Warning Bot chat* \nสามารถเลือกบริการที่ต้องการจากเมนูด้านล่างได้เลย',
    menuOptions
  );
};

// ฟังก์ชันส่งแจ้งเตือนแผ่นดินไหวไปยังผู้ใช้ทั้งหมด
async function sendEarthquakeAlert(earthquake, riskDistricts, connection) {
  const [subscribers] = await connection.execute('SELECT chat_id FROM users');
  if (subscribers.length === 0) {
    console.error('No subscribers found');
    return;
  }

  const timeFormatted = new Date(earthquake.time).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
  let message = `*🚨 แจ้งเตือนแผ่นดินไหว! 🚨*\n` +
                `- *สถานที่*: ${earthquake.place}\n` +
                `- *ขนาด*: ${earthquake.magnitude} ริกเตอร์\n` +
                `- *เวลา*: ${timeFormatted}\n` +
                `- *ความลึก*: ${earthquake.depth} กม.\n` +
                `- *พิกัด*: (${earthquake.latitude}, ${earthquake.longitude})\n\n` +
                `*⚠️ โปรดเฝ้าระวังแผ่นดินไหว!  หากท่านอยู่ภายในอาคารสูง กรุณาอพยพออกจากอาคารให้เร็วที่สุดและปฏิบัติตามแนวทางการรับมือแผ่นดินไหวอย่างเคร่งครัด*\n`;

  const menuOptions = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'พื้นที่เฝ้าระวัง', callback_data: `watch_areas_${earthquake.id}` },
          { text: 'แนวทางการรับมือ', callback_data: 'safety_info' },
        ],
      ],
    },
    parse_mode: 'Markdown',
  };

  for (let i = 0; i < subscribers.length; i++) {
    try {
      await bot.sendMessage(subscribers[i].chat_id, message, menuOptions);
      console.log(`Sent earthquake alert to Telegram chat ${subscribers[i].chat_id}`);
      if (i < subscribers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100)); // หน่วง 100ms
      }
    } catch (error) {
      console.error(`Error sending to ${subscribers[i].chat_id}:`, error.message);
    }
  }

  // บันทึกว่าแจ้งเตือนแล้ว
  await connection.execute(
    'INSERT INTO notified_earthquakes (earthquake_id) VALUES (?)',
    [earthquake.id]
  );
}

// ฟังก์ชันตรวจจับแผ่นดินไหวใหม่
async function checkForNewEarthquakes() {
  let connection;
  try {
    connection = await createConnection();
    console.log('Checking for new earthquakes...');

    // ดึงแผ่นดินไหวล่าสุดจากตาราง earthquakes
    const [earthquakes] = await connection.execute(`
      SELECT id, magnitude, place, time, latitude, longitude, depth
      FROM earthquakes
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (earthquakes.length === 0) {
      console.log('No earthquakes found in database');
      return;
    }

    const latestEarthquake = earthquakes[0];

    // ตรวจสอบว่าแจ้งเตือนไปแล้วหรือไม่
    const [notified] = await connection.execute(
      'SELECT earthquake_id FROM notified_earthquakes WHERE earthquake_id = ?',
      [latestEarthquake.id]
    );

    if (notified.length > 0) {
      console.log(`Earthquake ${latestEarthquake.id} already notified, skipping`);
      return;
    }

    // ดึงข้อมูลความเสี่ยงจาก district_risks
    const [riskDistricts] = await connection.execute(`
      SELECT district_name, risk_level, high_rise_count
      FROM district_risks
      WHERE earthquake_id = ? AND risk_level IN ('Light', 'Moderate', 'High', 'Very High', 'Severe')
      ORDER BY FIELD(risk_level, 'Severe', 'Very High', 'High', 'Moderate', 'Light')
    `, [latestEarthquake.id]);

    // ตรวจสอบว่ามีพื้นที่เสี่ยงหรือไม่
    if (riskDistricts.length === 0) {
      console.log(`No risk districts found for earthquake ${latestEarthquake.id}, skipping alert`);
      // บันทึกว่าแจ้งเตือนแล้ว เพื่อป้องกันการตรวจซ้ำ
      await connection.execute(
        'INSERT INTO notified_earthquakes (earthquake_id) VALUES (?)',
        [latestEarthquake.id]
      );
      return;
    }

    // ส่งแจ้งเตือน
    await sendEarthquakeAlert(latestEarthquake, riskDistricts, connection);
  } catch (error) {
    console.error('Error checking for earthquakes:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

// เมื่อผู้ใช้เริ่มแชทหรือใช้คำสั่ง /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  let connection;
  try {
    connection = await createConnection();
    await connection.execute('INSERT INTO users (chat_id) VALUES (?)', [chatId]);
    bot.sendMessage(
      chatId,
      '*ยินดีต้อนรับสู่ Earthquake Bot! 🌍*\nบอทนี้ช่วยให้คุณทราบข้อมูลเกี่ยวกับแผ่นดินไหวและความปลอดภัย\nคุณสมัครรับการแจ้งเตือนแผ่นดินไหวเรียบร้อย!\n*เริ่มต้นโดยเลือกตัวเลือกจากเมนู!*',
      { parse_mode: 'Markdown' }
    );
    sendMainMenu(chatId);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      bot.sendMessage(
        chatId,
        '*ยินดีต้อนรับกลับสู่ Earthquake Bot! 🌍*\nคุณสมัครรับการแจ้งเตือนอยู่แล้ว\n*เริ่มต้นโดยเลือกตัวเลือกจากเมนู!*',
        { parse_mode: 'Markdown' }
      );
      sendMainMenu(chatId);
    } else {
      console.error('Error in /start:', error.message);
      bot.sendMessage(chatId, 'เกิดข้อผิดพลาด กรุณาลองใหม่', { parse_mode: 'Markdown' });
    }
  } finally {
    if (connection) await connection.end();
  }
});

// เมื่อผู้ใช้ใช้คำสั่ง /subscribe
bot.onText(/\/subscribe/, async (msg) => {
  const chatId = msg.chat.id;
  let connection;
  try {
    connection = await createConnection();
    await connection.execute('INSERT INTO users (chat_id) VALUES (?)', [chatId]);
    bot.sendMessage(chatId, 'สมัครรับการแจ้งเตือนแผ่นดินไหวเรียบร้อย!', { parse_mode: 'Markdown' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      bot.sendMessage(chatId, 'คุณสมัครรับการแจ้งเตือนอยู่แล้ว!', { parse_mode: 'Markdown' });
    } else {
      console.error('Error in /subscribe:', error.message);
      bot.sendMessage(chatId, 'เกิดข้อผิดพลาด กรุณาลองใหม่', { parse_mode: 'Markdown' });
    }
  } finally {
    if (connection) await connection.end();
  }
});

// เมื่อผู้ใช้ใช้คำสั่ง /unsubscribe
bot.onText(/\/unsubscribe/, async (msg) => {
  const chatId = msg.chat.id;
  let connection;
  try {
    connection = await createConnection();
    const [result] = await connection.execute('DELETE FROM  users WHERE chat_id = ?', [chatId]);
    if (result.affectedRows > 0) {
      bot.sendMessage(chatId, 'ยกเลิกการสมัครรับการแจ้งเตือนเรียบร้อย!', { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, 'คุณยังไม่ได้สมัครรับการแจ้งเตือน!', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error in /unsubscribe:', error.message);
    bot.sendMessage(chatId, 'เกิดข้อผิดพลาด กรุณาลองใหม่', { parse_mode: 'Markdown' });
  } finally {
    if (connection) await connection.end();
  }
});

// เมื่อผู้ใช้ใช้คำสั่ง /menu
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  sendMainMenu(chatId);
});

// จัดการการกดปุ่ม Inline Keyboard
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  let connection;
  try {
    connection = await createConnection();
    if (data.startsWith('watch_areas_')) {
      const earthquakeId = data.split('_')[2];
      let message = `*พื้นที่เฝ้าระวังแผ่นดินไหว*\n\n` +
                    `*ระดับความเสี่ยงและความหมาย:*\n`;
      for (const [level, description] of Object.entries(riskLevelDescriptions)) {
        message += `- *${level}*: ${description}\n`;
      }
      message += '\n';

      const [riskDistricts] = await connection.execute(`
        SELECT district_name, risk_level
        FROM district_risks
        WHERE earthquake_id = ? AND risk_level IN ('Light', 'Moderate', 'High', 'Very High', 'Severe')
        ORDER BY FIELD(risk_level, 'Severe', 'Very High', 'High', 'Moderate', 'Light')
      `, [earthquakeId]);

      if (riskDistricts && riskDistricts.length > 0) {
        message += `*เขตที่มีความเสี่ยงในกรุงเทพฯ:*\n`;
        riskDistricts.forEach(district => {
          message += `- *${district.district_name}*: ${district.risk_level}\n`;
        });
      } else {
        message += `*เขตที่มีความเสี่ยงในกรุงเทพฯ:* ไม่พบเขตที่มีความเสี่ยง\n`;
      }

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      switch (data) {
        case 'latest_earthquake':
          const [latest] = await connection.execute(`
            SELECT magnitude, place, time, depth
            FROM earthquakes
            ORDER BY created_at DESC
            LIMIT 1
          `);
          if (latest.length === 0) {
            bot.sendMessage(chatId, 'ไม่พบข้อมูลแผ่นดินไหวล่าสุด', { parse_mode: 'Markdown' });
          } else {
            const timeFormatted = new Date(latest[0].time).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
            bot.sendMessage(
              chatId,
              `*ข้อมูลแผ่นดินไหวล่าสุด*\n- *สถานที่*: ${latest[0].place}\n- *ขนาด*: ${latest[0].magnitude} ริกเตอร์\n- *เวลา*: ${timeFormatted}\n- *ความลึก*: ${latest[0].depth} กม.`,
              { parse_mode: 'Markdown' }
            );
          }
          break;
        case 'find_city':
          const [latestEq] = await connection.execute(`
            SELECT id, place
            FROM earthquakes
            ORDER BY created_at DESC
            LIMIT 1
          `);
          const location = latestEq.length > 0 ? latestEq[0].place : 'ไม่ทราบสถานที่';
          const earthquakeId = latestEq.length > 0 ? latestEq[0].id : null;

          let riskDistrictsMessage = '';
          if (earthquakeId) {
            const [riskDistricts] = await connection.execute(`
              SELECT district_name, risk_level, high_rise_count
              FROM district_risks
              WHERE earthquake_id = ?
              AND risk_level IN ('Light', 'Moderate', 'High', 'Very High', 'Severe')
              ORDER BY FIELD(risk_level, 'Severe', 'Very High', 'High', 'Moderate', 'Light')
            `, [earthquakeId]);

            if (riskDistricts.length > 0) {
              riskDistrictsMessage = riskDistricts
                .map(district => `- *${district.district_name}*: ${district.risk_level}`)
                .join('\n');
            } else {
              riskDistrictsMessage = 'ไม่พบเขตที่มีความเสี่ยงในขณะนี้';
            }
          } else {
            riskDistrictsMessage = 'ไม่พบข้อมูลแผ่นดินไหวล่าสุด';
          }

          bot.sendMessage(
            chatId,
            `*พื้นที่เสี่ยงใกล้แผ่นดินไหวล่าสุด (${location})*\n\n${riskDistrictsMessage}`,
            { parse_mode: 'Markdown' }
          );
          break;
        case 'safety_info':
          try {
            await bot.sendPhoto(
              chatId,
              'photo/safety.gif',
              {
                caption: `*แนวทางการรับมือแผ่นดินไหว*`,
                parse_mode: 'Markdown'
              }
            );
          } catch (error) {
            console.error('Error sending safety image:', error.message);
            bot.sendMessage(
              chatId,
              `*แนวทางการรับมือแผ่นดินไหว*\n\n*ขออภัย ไม่สามารถแสดงรูปภาพได้*`,
              { parse_mode: 'Markdown' }
            );
          }
          break;
        case 'support':
          bot.sendMessage(
            chatId,
            `*เกี่ยวกับฉัน*\nสวัสดีจ้า ฉันคือ chatbot Earthquake warning  แจ้งเตือนแผ่นดินไหว คุณจะได้รับการแจ้งเตือนแผ่นดินไหวเมื่อเพิ่มเพื่อนกับฉัน คุณสามารถติดต่อสอบถามฉันได้ที่ช่องทางด้านล่างจ้า\n- 📧 อีเมล: earthquakerisks@bot.com\n- 📱 โทร: 123-456-7890`,
            { parse_mode: 'Markdown' }
          );
          break;
      }
    }
    bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Error in callback_query:', error.message);
    bot.sendMessage(chatId, 'เกิดข้อผิดพลาด กรุณาลองใหม่', { parse_mode: 'Markdown' });
  } finally {
    if (connection) await connection.end();
  }
});

// จัดการข้อความจากผู้ใช้ (สำหรับการสนทนาทั่วไป)
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.toLowerCase();

  if (text.startsWith('/')) return;

  if (text.includes('สวัสดี') || text.includes('hello')) {
    bot.sendMessage(chatId, 'สวัสดี!', { parse_mode: 'Markdown' });
  } else if (text.includes('แผ่นดินไหวคือ')) {
    bot.sendMessage(
      chatId,
      '*แผ่นดินไหวคืออะไร?*\nแผ่นดินไหว เป็นภัยพิบัติทางธรรมชาติที่เกิดจากการสั่นสะเทือนของพื้นดิน อันเนื่องมาจากการปลดปล่อยพลังงานเพื่อลดความเครียดที่สะสมไว้ภายในโลกออกมาเพื่อปรับสมดุลของเปลือกโลกให้คงที่ !',
      { parse_mode: 'Markdown' }
    );
  } else if (text.includes('อะไร') || text.includes('ช่วย') || text.includes('ทำได้')) {
    bot.sendMessage(chatId, getRandomResponse('questions'), { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, getRandomResponse('default'), { parse_mode: 'Markdown' });
  }
});

// จำลองการตรวจจับแผ่นดินไหวทุก 1 วินาที
setInterval(checkForNewEarthquakes, 1000);

// รันการตรวจจับครั้งแรกเมื่อบอทเริ่มทำงาน
checkForNewEarthquakes();

module.exports = bot;*/