const XLSX = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\Admin\\Documents\\Quan_ly_nhan_su\\frontend\\public\\uploads\\1782373848302_Copy_of__FILE_B_O_C_O_D_Y_L_P_DU_H_C_K__T4_2026_-_DUNG_SS.xlsx';

function run() {
  try {
    console.log("Reading file:", filePath);
    const workbook = XLSX.readFile(filePath);
    console.log("Sheet names:", workbook.SheetNames);
    
    // Print first 5 sheet contents summary
    workbook.SheetNames.slice(0, 10).forEach(name => {
      const worksheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log(`- Sheet "${name}": ${data.length} rows`);
      if (data.length > 0) {
        console.log(`  Row 0:`, data[0].slice(0, 5));
      }
      if (data.length > 1) {
        console.log(`  Row 1:`, data[1].slice(0, 5));
      }
    });

  } catch (e) {
    console.error(e);
  }
}

run();
