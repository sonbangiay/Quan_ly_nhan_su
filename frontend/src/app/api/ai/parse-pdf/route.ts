import { NextResponse } from 'next/server';
import { getGeminiApiKey } from '@/lib/getGeminiApiKey';

export async function POST(req: Request) {
  try {
    const { base64Pdf, clientGeminiKey } = await req.json();

    if (!base64Pdf) {
      return NextResponse.json({ success: false, error: 'Thiếu dữ liệu file PDF' }, { status: 400 });
    }

    const apiKey = clientGeminiKey || await getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'MISSING_GEMINI_KEY',
        message: 'Bạn chưa cấu hình API Key của Google Gemini.' 
      }, { status: 400 });
    }

    const prompt = `
Bạn là một trợ lý AI chuyên nghiệp phục vụ cho trung tâm giáo dục HRM Nhân Phú.
Nhiệm vụ của bạn là đọc và phân tích nội dung đề thi từ file PDF đính kèm. Bạn phải đọc trực tiếp cấu trúc từ file PDF (kể cả Furigana, tiếng Nhật, tiếng Việt) và trích xuất TOÀN BỘ câu hỏi thành danh sách JSON mảng theo định dạng mẫu sau:
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
1. Đối với mỗi câu hỏi, kiểm tra loại của câu đó để gán "type" là "MULTIPLE_CHOICE" (nếu là trắc nghiệm có các lựa chọn A, B, C, D) hoặc "SHORT_ANSWER" (nếu là tự luận, điền từ vào ô trống). Đề thi tiếng Nhật điền khuyết như "1. _____ のところに何を入れますか" là SHORT_ANSWER.
2. Tạo chuỗi ID ngẫu nhiên có độ dài 9 ký tự (chữ và số) cho trường "id" của từng câu hỏi để đảm bảo tính duy nhất.
3. Chú ý: Phải bỏ qua Furigana (chữ nhỏ) hoặc phiên âm rác, chỉ đọc hiểu cấu trúc thực tế của câu hỏi để trả về tiếng Nhật/Việt chính xác.
4. Quan trọng nhất: CHỈ trả về dữ liệu JSON mảng thuần túy, không được bọc trong thẻ markdown \`\`\`json hay bất kỳ văn bản giải thích nào khác ngoài chuỗi mảng JSON sạch để hệ thống dễ dàng JSON.parse(). Không được bình luận thêm.
`;

    // Gọi Gemini 1.5 Flash REST API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Pdf
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      let errorMsg = data.error?.message || 'Lỗi không xác định từ máy chủ Google Gemini';
      if (data.error?.code === 403 || errorMsg.includes('API key not valid')) {
        return NextResponse.json({ success: false, error: 'INVALID_GEMINI_KEY', message: 'API Key không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
      }
      return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }

    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Dọn dẹp chuỗi JSON nếu Gemini tự động bọc trong ```json
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    }

    try {
      const parsedQuestions = JSON.parse(cleanJson);
      return NextResponse.json({ success: true, questions: parsedQuestions, method: 'gemini_ai' });
    } catch (parseErr) {
      console.error('Lỗi parse JSON từ Gemini:', responseText, parseErr);
      return NextResponse.json({ 
        success: false, 
        error: 'Dữ liệu trả về từ AI không đúng định dạng JSON. Vui lòng thử lại.',
        raw: responseText 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Lỗi API parse-pdf (Gemini):', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
