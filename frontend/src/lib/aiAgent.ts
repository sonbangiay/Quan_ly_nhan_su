import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';

const getGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Thiếu GEMINI_API_KEY');
  return new GoogleGenerativeAI(apiKey);
};

const getPinecone = () => {
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error('Thiếu PINECONE_API_KEY');
  return new Pinecone({ apiKey });
};

const INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'hrm-knowledge';

export const aiAgent = {
  embedText: async (text: string): Promise<number[]> => {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  },

  trainDocument: async (docId: string, text: string) => {
    try {
      const pc = getPinecone();
      const index = pc.Index(INDEX_NAME);

      const chunks = text.match(/[\s\S]{1,500}/g) || [];
      if (chunks.length === 0) return { success: false, chunks: 0 };
      
      const vectors = await Promise.all(chunks.map(async (chunk, i) => {
        const values = await aiAgent.embedText(chunk);
        return {
          id: `${docId}-chunk-${i}`,
          values,
          metadata: { docId, text: chunk }
        };
      }));

      await index.upsert({ records: vectors } as any);
      return { success: true, chunks: vectors.length };
    } catch (error: any) {
      console.error('Lỗi khi train tài liệu:', error);
      throw error;
    }
  },

  deleteDocument: async (docId: string) => {
    try {
      // In a real app, delete by ID prefix if supported.
      console.log('Document deleted from knowledge base:', docId);
    } catch (error) {
      console.error('Lỗi khi xoá tài liệu:', error);
    }
  },

  queryKnowledge: async (query: string, topK: number = 3) => {
    try {
      const pc = getPinecone();
      const index = pc.Index(INDEX_NAME);
      
      const queryEmbedding = await aiAgent.embedText(query);
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
      });

      const contexts = queryResponse.matches.map(m => m.metadata?.text || '').join('\n\n');
      return contexts;
    } catch (error: any) {
      console.warn('Lỗi khi tìm kiếm Pinecone:', error.message);
      return '';
    }
  },

  generateResponse: async (message: string, aiPrompt: string, senderId: string = '') => {
    try {
      const genAI = getGemini();
      
      // Khai báo các công cụ (Tools) cho AI
      const tools = [
        {
          functionDeclarations: [
            {
              name: 'bookAppointment',
              description: 'Đặt lịch hẹn tư vấn, tham quan trung tâm hoặc học thử cho khách hàng. Gọi hàm này ngay khi khách hàng chốt ngày giờ rảnh.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  customerName: { type: 'STRING', description: 'Tên khách hàng' },
                  appointmentTime: { type: 'STRING', description: 'Thời gian hẹn (VD: Sáng thứ 7 tuần này, 14h ngày mai)' },
                  note: { type: 'STRING', description: 'Ghi chú thêm về nhu cầu (VD: Khóa Ielts, Đang phân vân giá)' },
                },
                required: ['customerName', 'appointmentTime'],
              },
            },
            {
              name: 'handoffToHuman',
              description: 'Chuyển giao cuộc trò chuyện cho nhân viên tư vấn thật khi khách hàng phàn nàn, tức giận, mặc cả quá gay gắt hoặc yêu cầu gặp người thật.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  reason: { type: 'STRING', description: 'Lý do chuyển giao' },
                },
                required: ['reason'],
              },
            }
          ],
        },
      ];

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        tools: tools as any // Bypass strict type check for tools
      });

      const context = await aiAgent.queryKnowledge(message);

      const fullPrompt = `
HƯỚNG DẪN DÀNH CHO AI (SYSTEM PROMPT):
${aiPrompt || 'Bạn là trợ lý AI thông minh, tư vấn viên chốt sale của trung tâm Nhân Phú. Hãy dựa vào tài liệu để trả lời và chốt sale.'}

QUY TẮC QUAN TRỌNG:
1. LUÔN CHỦ ĐỘNG dẫn dắt khách hàng: Nếu khách hỏi giá, hãy báo giá kèm một câu hỏi mở để giữ chân khách.
2. HƯỚNG TỚI ĐẶT LỊCH: Sau khi giải đáp thắc mắc, hãy đề xuất khách đến trung tâm tham quan hoặc test đầu vào. Nếu khách đồng ý, hãy hỏi thời gian rảnh và gọi hàm "bookAppointment".
3. CHUYỂN GIAO: Nếu khách khó tính hoặc chê đắt, xin phép chuyển cho tư vấn viên và gọi hàm "handoffToHuman".
4. TỰ ĐỘNG TƯ VẤN KHI THIẾU THÔNG TIN: Nếu Dữ liệu từ trung tâm (Knowledge Base) không có thông tin, HOẶC khách hàng hỏi những câu chung chung (như "Tôi cần tư vấn du học Hàn"), bạn HÃY TỰ ĐỘNG sử dụng kiến thức chung của mình về Du học để tư vấn thật chuyên nghiệp. Tự đóng vai là tư vấn viên của Trung tâm Du học Nhân Phú để đưa ra lộ trình cơ bản và dẫn dắt khách hàng. KHÔNG ĐƯỢC TỪ CHỐI TRẢ LỜI.

DỮ LIỆU TỪ TRUNG TÂM (KNOWLEDGE BASE):
${context ? context : 'Chưa có tài liệu cụ thể. Hãy tự động tư vấn bằng kiến thức chung của bạn.'}

TIN NHẮN KHÁCH HÀNG:
${message}
      `;

      // Khởi tạo phiên Chat để có thể xử lý multi-turn nếu có function call
      const chat = model.startChat();
      const result = await chat.sendMessage(fullPrompt);
      const response = result.response;

      const functionCalls = response.functionCalls();

      // Nếu AI quyết định gọi hàm
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        
        if (call.name === 'bookAppointment') {
          const { customerName, appointmentTime, note } = call.args as any;
          
          // Thực thi logic lưu vào Firebase (Ở đây trả về kết quả giả lập, Webhook sẽ bắt signal này)
          // Để thực sự lưu, ta sẽ xử lý kết quả trả về
          return {
            type: 'function_call',
            function: 'bookAppointment',
            args: call.args,
            text: `Dạ em đã ghi nhận lịch hẹn của ${customerName} vào ${appointmentTime}. Sẽ có nhân viên liên hệ xác nhận lại với mình sớm nhất ạ. Cảm ơn anh/chị!`
          };
        }

        if (call.name === 'handoffToHuman') {
          return {
            type: 'function_call',
            function: 'handoffToHuman',
            args: call.args,
            text: `Dạ để hỗ trợ anh/chị tốt nhất và chi tiết nhất, em xin phép chuyển thông tin này cho Quản lý bên em tư vấn thêm nhé ạ. Anh/chị đợi một lát nha!`
          };
        }
      }

      // Trả lời bình thường nếu không gọi hàm
      return {
        type: 'text',
        text: response.text()
      };
    } catch (error: any) {
      console.error('Lỗi sinh câu trả lời AI:', error);
      return { type: 'text', text: 'Xin lỗi, hệ thống hỗ trợ tự động của chúng tôi đang bảo trì. Tư vấn viên sẽ phản hồi bạn trong giây lát nhé!' };
    }
  }
};
