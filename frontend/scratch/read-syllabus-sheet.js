const XLSX = require('xlsx');

const filePath = 'c:\\Users\\Admin\\Documents\\Quan_ly_nhan_su\\frontend\\public\\uploads\\1782373848302_Copy_of__FILE_B_O_C_O_D_Y_L_P_DU_H_C_K__T4_2026_-_DUNG_SS.xlsx';

function run() {
  try {
    const workbook = XLSX.readFile(filePath);
    
    console.log("=== PHÂN PHỐI CHƯƠNG TRÌNH DẠY ===");
    const ws1 = workbook.Sheets["PHÂN PHỐI CHƯƠNG TRÌNH DẠY"];
    const data1 = XLSX.utils.sheet_to_json(ws1, { header: 1 });
    for (let i = 0; i < 40; i++) {
      if (data1[i]) console.log(`Row ${i}:`, data1[i].slice(0, 8));
    }

    console.log("\n=== Kế hoạch lớp tối ===");
    const ws2 = workbook.Sheets["Kế hoạch lớp tối "];
    const data2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
    for (let i = 0; i < 30; i++) {
      if (data2[i]) console.log(`Row ${i}:`, data2[i].slice(0, 8));
    }

  } catch (e) {
    console.error(e);
  }
}

run();
