const mysql = require('mysql2');
const { Country, State, City } = require('country-state-city');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '6530300783',
  database: 'earthquake'
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    return;
  }
  console.log('Connected to MySQL database: testcity');
});

// ฟังก์ชันบันทึกข้อมูลจังหวัดและอำเภอ
function saveProvincesAndDistricts(callback) {
  // ตรวจสอบว่ามีข้อมูลในตาราง provinces หรือยัง
  db.query(`SELECT COUNT(*) as count FROM provinces`, (err, results) => {
    if (err) {
      console.error('Error checking provinces table:', err.message);
      return callback(err, null);
    }

    const provinceCount = results[0].count;

    if (provinceCount > 0) {
      // ถ้ามีข้อมูลแล้ว ข้ามการดึงและแสดงใน console
      console.log('ข้อมูลถูกดึงมาแล้ว');
      return callback(null, { message: 'Data already fetched' });
    }

    // ดึงข้อมูลจังหวัด
    const provinces = State.getStatesOfCountry('TH');
    provinces.forEach((province) => {
      db.query(
        `INSERT INTO provinces (provinces_Num, name, latitude, longitude) VALUES (?, ?, ?, ?)`,
        [province.isoCode, province.name, province.latitude || '', province.longitude || ''],
        (err) => {
          if (err) {
            console.error('Error inserting province:', err.message);
          } else {
            console.log(`Successfully inserted province: ${province.name}`);
          }
        }
      );
    });

    // ดึงข้อมูลอำเภอ
    const districts = City.getCitiesOfCountry('TH');
    districts.forEach((district) => {
      db.query(
        `INSERT INTO districts (name, provinceCode, latitude, longitude) VALUES (?, ?, ?, ?)`,
        [district.name, district.stateCode, district.latitude || '', district.longitude || ''],
        (err) => {
          if (err) {
            console.error('Error inserting district:', err.message);
          } else {
            console.log(`Successfully inserted district: ${district.name}`);
          }
        }
      );
    });

    console.log('ดึงข้อมูลจังหวัดและอำเภอสำเร็จ');
    callback(null, { message: 'Provinces and districts data saved' });
  });
}

module.exports = {
  db,
  saveProvincesAndDistricts
};