const mysql = require('mysql2/promise');

// เชื่อมต่อ MySQL
async function Connection() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '6530300783',
        database: 'earthquake'
    });
    console.log('Connected to MySQL database: earthquake');
    return connection;
}

// ฟังก์ชันสำหรับดึงข้อมูล Dashboard
async function Dashboard() {
    let connection;
    try {
        connection = await Connection();

        // 1. จำนวนผู้ใช้ที่สมัครรับการแจ้งเตือนใน telegram
        const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM userchatbot');
        const totalUsers = userCount[0].count;

        // 2. จำนวนการแจ้งเตือนแผ่นดินไหวทั้งหมด
        const [notificationCount] = await connection.execute('SELECT COUNT(*) as count FROM notified_earthquakes');
        const totalNotifications = notificationCount[0].count;

        // 3. ข้อมูลแผ่นดินไหวล่าสุดว่าเกิดที่ไหน
        const [latestEarthquake] = await connection.execute(`
            SELECT e.*, p.name as province_name
            FROM earthquakes e
            LEFT JOIN provinces p ON p.name = SUBSTRING_INDEX(e.place, ' of ', -1)
            ORDER BY e.created_at DESC
            LIMIT 1
        `);
        const earthquake = latestEarthquake.length > 0 ? latestEarthquake[0] : null;

        // 4. พื้นที่เสี่ยงจากแผ่นดินไหวล่าสุดที่มีการบันทึกลงตาราง
        let riskDistricts = [];
        if (earthquake) {
            const [districts] = await connection.execute(`
                SELECT dr.district_name, dr.risk_level, dr.pga, dr.distance_km, dr.high_rise_count, d.latitude, d.longitude
                FROM district_risks dr
                JOIN districts d ON dr.district_name = d.name
                WHERE dr.earthquake_id = ?
                ORDER BY FIELD(dr.risk_level, 'Severe', 'Very High', 'High', 'Moderate', 'Light')
            `, [earthquake.id]);
            riskDistricts = districts;
        }

        // สถิติแผ่นดินไหวตามจังหวัดตอนนี้ทดสอบแค่ในกรุงเทพค่ะ
        const [earthquakeStats] = await connection.execute(`
            SELECT p.name as province_name, COUNT(e.id) as earthquake_count
            FROM earthquakes e
            JOIN provinces p ON p.name = SUBSTRING_INDEX(e.place, ' of ', -1)
            GROUP BY p.name
            ORDER BY earthquake_count DESC
            LIMIT 5
        `);

        return {
            totalUsers,
            totalNotifications,
            latestEarthquake: earthquake,
            riskDistricts,
            earthquakeStats
        };
    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        throw error;
    } finally {
        if (connection) await connection.end();
    }
}

module.exports = { Connection, Dashboard };