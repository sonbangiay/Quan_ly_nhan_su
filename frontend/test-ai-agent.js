const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const tools = [
    {
      functionDeclarations: [
        {
          name: 'bookAppointment',
          description: 'Đặt lịch hẹn',
          parameters: {
            type: 'OBJECT',
            properties: {
              customerName: { type: 'STRING', description: 'Tên' },
              appointmentTime: { type: 'STRING', description: 'Thời gian' },
            },
            required: ['customerName', 'appointmentTime'],
          },
        }
      ],
    },
  ];

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools });
    const chat = model.startChat();
    const result = await chat.sendMessage("Xin chào");
    console.log("Success:", result.response.text());
  } catch (e) {
    console.error("AI Error:", e.message);
  }
}

test();
