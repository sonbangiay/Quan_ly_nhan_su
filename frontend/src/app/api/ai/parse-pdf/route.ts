import { NextResponse } from 'next/server';

// Polyfill DOMMatrix for pdf-parse server-side Next.js build compatibility
if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix {};
}

const pdf = require('pdf-parse');

export async function POST(req: Request) {
  try {
    const { base64Pdf } = await req.json();

    if (!base64Pdf) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu file PDF' }, { status: 400 });
    }

    // 1. Phân tích PDF lấy text bằng pdf-parse
    let extractedText = '';
    try {
      const buffer = Buffer.from(base64Pdf, 'base64');
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text || '';
    } catch (pdfErr: any) {
      console.error('Lỗi khi parse PDF bằng pdf-parse:', pdfErr);
      return NextResponse.json({ success: false, error: 'Không thể đọc nội dung file PDF này: ' + pdfErr.message }, { status: 500 });
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ success: false, error: 'File PDF rỗng hoặc không có dữ liệu văn bản có thể trích xuất.' }, { status: 400 });
    }

    // 2. Thuật toán trích xuất câu hỏi cục bộ (Local Regex Parser - Free)
    // Thay thế OpenAI bằng logic phân tích văn bản để tiết kiệm chi phí và không cần API Key
    
    // Xóa bớt khoảng trắng thừa và chuẩn hóa xuống dòng
    let text = extractedText.replace(/\r\n/g, '\n');
    
    // Biểu thức chính quy tìm các từ khóa bắt đầu câu hỏi (VD: Câu 1:, Bài 1., Question 1:)
    const questionRegex = /(?:Câu|Bài|Question)\s*\d+\s*[\.\:]/gi;
    
    const matches = [...text.matchAll(questionRegex)];
    const parsedQuestions = [];
    
    if (matches.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Không tìm thấy mẫu câu hỏi nào trong đề thi. Vui lòng đảm bảo đề thi có định dạng "Câu 1:", "Câu 2:" v.v.',
        raw: extractedText
      }, { status: 400 });
    }
    
    for (let i = 0; i < matches.length; i++) {
      const startIdx = matches[i].index;
      // Câu hỏi bắt đầu từ sau chữ "Câu 1:"
      const qStartIdx = startIdx + matches[i][0].length;
      const endIdx = i + 1 < matches.length ? matches[i+1].index : text.length;
      
      const block = text.slice(qStartIdx, endIdx).trim();
      
      // Biểu thức chính quy tìm các đáp án (VD: A., B., C., D. hoặc A), B), C), D))
      // Đảm bảo nó bắt đầu bằng khoảng trắng hoặc đầu dòng để không nhầm chữ cái trong từ
      const optionRegex = /(?:^|\s|\n)(A|B|C|D)[\.\)]\s/gi;
      const optMatches = [...block.matchAll(optionRegex)];
      
      const generateId = () => Math.random().toString(36).substring(2, 11);
      
      if (optMatches.length >= 2) { // Có ít nhất 2 đáp án (A, B) thì coi như trắc nghiệm
        // Lấy nội dung câu hỏi (phần trước đáp án đầu tiên)
        const qText = block.slice(0, optMatches[0].index).trim();
        
        const options: any[] = [];
        for (let j = 0; j < optMatches.length; j++) {
          const oStart = optMatches[j].index + optMatches[j][0].length;
          const oEnd = j + 1 < optMatches.length ? optMatches[j+1].index : block.length;
          const oText = block.slice(oStart, oEnd).trim();
          
          let letter = optMatches[j][1].toUpperCase();
          // Kiểm tra xem ID (A, B, C, D) đã có chưa, nếu có rồi (do regex nhầm) thì bỏ qua
          if (!options.find(o => o.id === letter)) {
             options.push({ id: letter, text: oText });
          }
        }
        
        parsedQuestions.push({
          id: generateId(),
          type: 'MULTIPLE_CHOICE',
          text: qText || "Câu hỏi trống",
          options: options,
          correctAnswer: options.length > 0 ? options[0].id : 'A', // Mặc định A, GV tự sửa sau
          points: 10
        });
      } else {
        // Tự luận (Không tìm thấy A, B, C, D)
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
