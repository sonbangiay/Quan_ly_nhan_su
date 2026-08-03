import { NextResponse } from 'next/server';
const PDFParser = require("pdf2json");

export async function POST(req: Request) {
  try {
    const { base64Pdf } = await req.json();

    if (!base64Pdf) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu file PDF' }, { status: 400 });
    }

    // 1. Phân tích PDF lấy text bằng pdf2json (ổn định hơn pdf-parse trong Next.js)
    let extractedText = '';
    try {
      const buffer = Buffer.from(base64Pdf, 'base64');
      extractedText = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.parseBuffer(buffer);
      });
    } catch (pdfErr: any) {
      console.error('Lỗi khi parse PDF bằng pdf2json:', pdfErr);
      return NextResponse.json({ success: false, error: 'Không thể đọc nội dung file PDF này. ' + (pdfErr.message || '') }, { status: 500 });
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json({ success: false, error: 'File PDF rỗng hoặc không có dữ liệu văn bản có thể trích xuất.' }, { status: 400 });
    }

    // 2. Thuật toán trích xuất câu hỏi cục bộ (Local Heuristic Parser - Free)
    // Hỗ trợ cả định dạng Tiếng Việt (Câu 1:) và Tiếng Nhật (1., 2., 1), 2), 问题)
    
    // Xóa bớt khoảng trắng thừa và chuẩn hóa xuống dòng
    let text = extractedText.replace(/\r\n/g, '\n');
    
    // Tách văn bản bằng Regex bắt các đầu mục câu hỏi: 
    // - Câu 1:, Bài 1., Question 1:, 問題 1:
    // - Hoặc đầu dòng là số: "1.", "1)", "2."
    const questionRegex = /(?:(?:Câu|Bài|Question|問題)\s*[Ⅰ-Ⅻ\d]+\s*[\.\:\)]?|(?:\n|^)\s*\d+[\.\)])/gi;
    
    const matches = [...text.matchAll(questionRegex)];
    const parsedQuestions: any[] = [];
    
    if (matches.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Không tìm thấy mẫu câu hỏi nào trong đề thi. Vui lòng đảm bảo đề thi có định dạng đánh số như "Câu 1:", "1.", "1)" v.v.',
        raw: extractedText
      }, { status: 400 });
    }
    
    const generateId = () => Math.random().toString(36).substring(2, 11);
    
    for (let i = 0; i < matches.length; i++) {
      const startIdx = matches[i].index;
      const qStartIdx = startIdx + matches[i][0].length;
      const endIdx = i + 1 < matches.length ? matches[i+1].index : text.length;
      
      let block = text.slice(qStartIdx, endIdx).trim();
      if (!block) continue; // Bỏ qua nếu block rỗng
      
      // Khôi phục lại tiền tố của câu hỏi để hiển thị đẹp (như "Câu 1:")
      const prefixMatch = matches[i][0].trim();
      // Nếu là tiếng Nhật dạng "1." thì chỉ cần nội dung, còn nếu "Câu 1" thì giữ lại
      if (prefixMatch.match(/Câu|Bài|Question|問題/i)) {
         block = prefixMatch + ' ' + block;
      }
      
      // Tìm các đáp án trắc nghiệm A, B, C, D
      const optionRegex = /(?:^|\s|\n)(A|B|C|D|a|b|c|d)[\.\)]\s/gi;
      const optMatches = [...block.matchAll(optionRegex)];
      
      if (optMatches.length >= 2) { 
        // Lấy nội dung câu hỏi (phần trước đáp án đầu tiên)
        const qText = block.slice(0, optMatches[0].index).trim();
        
        const options: any[] = [];
        for (let j = 0; j < optMatches.length; j++) {
          const oStart = optMatches[j].index + optMatches[j][0].length;
          const oEnd = j + 1 < optMatches.length ? optMatches[j+1].index : block.length;
          const oText = block.slice(oStart, oEnd).trim();
          
          let letter = optMatches[j][1].toUpperCase();
          if (!options.find(o => o.id === letter)) {
             options.push({ id: letter, text: oText });
          }
        }
        
        parsedQuestions.push({
          id: generateId(),
          type: 'MULTIPLE_CHOICE',
          text: qText || "Câu hỏi trống",
          options: options,
          correctAnswer: options.length > 0 ? options[0].id : 'A',
          points: 10
        });
      } else {
        // Tự luận hoặc Điền khuyết
        parsedQuestions.push({
          id: generateId(),
          type: 'SHORT_ANSWER',
          text: block || "Câu hỏi tự luận trống",
          options: [],
          correctAnswer: '',
          points: 10
        });
      }
    }

    return NextResponse.json({ success: true, questions: parsedQuestions, method: 'local_heuristic' });

  } catch (error: any) {
    console.error('Lỗi API parse-pdf (Local):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
