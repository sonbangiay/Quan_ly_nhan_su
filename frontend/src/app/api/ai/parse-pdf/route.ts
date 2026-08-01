import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOpenaiApiKey } from '@/lib/getOpenaiApiKey';

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

    const apiKey = await getOpenaiApiKey();
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Thiếu cấu hình OPENAI_API_KEY trên máy chủ' }, { status: 500 });
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

    // 2. Khởi tạo OpenAI
    const openai = new OpenAI({ apiKey });

    const prompt = `
Bạn là một trợ lý AI chuyên nghiệp phục vụ cho trung tâm giáo dục HRM Nhân Phú.
Nhiệm vụ của bạn là phân tích nội dung văn bản đề thi dưới đây (được trích xuất từ đề thi gốc). Hãy trích xuất toàn bộ câu hỏi trong đề thi đó và trả về danh sách câu hỏi có cấu trúc JSON mảng theo định dạng mẫu sau:
[
  {
    "id": "chuỗi_id_ngẫu_nhiên_9_ký_tự",
    "type": "MULTIPLE_CHOICE",
    "text": "Nội dung câu hỏi trắc nghiệm (ví dụ: Từ nào sau đây có nghĩa là xin chào trong tiếng Nhật?)",
    "options": [
      { "id": "A", "text": "Konnichiwa" },
      { "id": "B", "text": "Sayonara" },
      { "id": "C", "text": "Arigatou" },
      { "id": "D", "text": "Sumimasen" }
    ],
    "correctAnswer": "A",
    "points": 10
  },
  {
    "id": "chuỗi_id_ngẫu_nhiên_9_ký_tự",
    "type": "SHORT_ANSWER",
    "text": "Nội dung câu hỏi điền từ hoặc tự luận ngắn (ví dụ: Điền từ thích hợp vào chỗ trống: Watashi wa ... desu.)",
    "options": [],
    "correctAnswer": "nihonjin",
    "points": 10
  }
]

Yêu cầu chi tiết:
1. Đối với mỗi câu hỏi, hãy kiểm tra loại của câu đó để gán "type" là "MULTIPLE_CHOICE" (nếu là trắc nghiệm có các lựa chọn A, B, C, D) hoặc "SHORT_ANSWER" (nếu là tự luận, điền từ vào ô trống).
2. Với "MULTIPLE_CHOICE": Phải trích xuất đầy đủ tất cả các phương án A, B, C, D vào mảng "options" theo đúng định dạng mẫu. Phải giải đề hoặc dựa trên nội dung được đánh dấu trong đề để điền đáp án đúng dạng chữ cái "A", "B", "C" hoặc "D" vào trường "correctAnswer".
3. Với "SHORT_ANSWER": Trường "options" bắt buộc phải là mảng rỗng ([]). Trường "correctAnswer" phải chứa đáp án đúng tương ứng (viết thường nếu có).
4. Phân bổ điểm ("points") mặc định là 10 cho mỗi câu hỏi.
5. Tạo một chuỗi ID ngẫu nhiên có độ dài 9 ký tự (chữ và số) cho trường "id" của từng câu hỏi để đảm bảo tính duy nhất.
6. Quan trọng nhất: CHỈ trả về dữ liệu JSON mảng thuần túy, không được bọc trong thẻ markdown \`\`\`json hay bất kỳ văn bản giải thích nào khác ngoài chuỗi mảng JSON sạch để hệ thống dễ dàng JSON.parse().

Nội dung đề thi trích xuất:
---
${extractedText}
---
`;

    // Gọi gpt-4o-mini của OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });

    const responseText = response.choices[0]?.message?.content?.trim() || '';

    // Dọn dẹp chuỗi JSON nếu OpenAI tự động bọc trong ```json
    let cleanJson = responseText;
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    try {
      const parsedQuestions = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, questions: parsedQuestions });
    } catch (parseErr) {
      console.error('Lỗi parse JSON từ OpenAI:', responseText, parseErr);
      return NextResponse.json({ 
        success: false, 
        error: 'Dữ liệu trả về từ AI không đúng định dạng JSON. Vui lòng thử lại.',
        raw: responseText 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Lỗi API parse-pdf (OpenAI):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
