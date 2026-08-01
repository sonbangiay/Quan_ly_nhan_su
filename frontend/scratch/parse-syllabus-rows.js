const XLSX = require('xlsx');

const filePath = 'c:\\Users\\Admin\\Documents\\Quan_ly_nhan_su\\frontend\\public\\uploads\\1782373848302_Copy_of__FILE_B_O_C_O_D_Y_L_P_DU_H_C_K__T4_2026_-_DUNG_SS.xlsx';

function run() {
  try {
    const workbook = XLSX.readFile(filePath);
    const ws = workbook.Sheets["PHÂN PHỐI CHƯƠNG TRÌNH DẠY"];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    
    let count = 0;
    for (let i = 4; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const content = row[4]; // Column 5
      if (content && String(content).trim()) {
        count++;
        console.log(`Row ${i} | Session ${count}: ${String(content).trim().split('\n')[0]}`);
      }
    }
    console.log(`Total sessions in sheet: ${count}`);

  } catch (e) {
    console.error(e);
  }
}

run();
