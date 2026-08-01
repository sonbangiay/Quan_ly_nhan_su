import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { base64Pdf } = await req.json();

    if (!base64Pdf) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu file PDF' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Thiếu cấu hình GEMINI_API_KEY trên máy chủ' }, { status: 500 });
    }

    const prompt = `
Bạn là một trợ lý AI chuyên nghiệp phục vụ cho trung tâm giáo dục HRM Nhân Phú.
Nhiệm vụ của bạn là đọc và phân tích đề thi từ file PDF được cung cấp. Hãy trích xuất toàn bộ câu hỏi trong đề thi đó và trả về danh sách câu hỏi có cấu trúc JSON mảng theo định dạng mẫu sau:
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
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Gọi Gemini với dữ liệu PDF dưới dạng inlineData
    const pdfPart = {
      inlineData: {
        data: base64Pdf,
        mimeType: 'application/pdf'
      }
    };

    const result = await model.generateContent([pdfPart, prompt]);
    const responseText = result.response.text().trim();

    // Dọn dẹp chuỗi JSON nếu Gemini tự động bọc trong ```json
    let cleanJson = responseText;
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    try {
      const parsedQuestions = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, questions: parsedQuestions });
    } catch (parseErr) {
      console.error('Lỗi parse JSON từ Gemini:', responseText, parseErr);
      return NextResponse.json({ 
        success: false, 
        error: 'Dữ liệu trả về từ AI không đúng định dạng JSON. Vui lòng thử lại.',
        raw: responseText 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Lỗi API parse-pdf:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
