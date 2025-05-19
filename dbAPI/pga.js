// db/pgaFormula.js

function calculatePGA({ M, R, SS = 0, NS = 0 }) {
    // ค่าจำลองจากตารางใน paper ของสูตร
    const c1 = -1.715;
    const c2 = 0.5;
    const c3 = -0.1;
    const c4 = -2.118;
    const c5 = 0.17;
    const c6 = 0.8;
    const c7 = 0.3;
    const c8 = 0.1;
  
    const Mh = 6.0;
  
    const logY = c1 +c2 * (M - Mh) +c3 * Math.pow(M - Mh, 2) +c4 * Math.log10(R + c5 * Math.exp(c6 * M)) +c7 * SS +c8 * NS;
    const PGA = Math.pow(10, logY);
    return PGA;
  }
  
  module.exports = {
    calculatePGA,
  };
  