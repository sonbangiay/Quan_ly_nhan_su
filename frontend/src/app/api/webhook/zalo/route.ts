import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, increment } from 'firebase/firestore';

// Zalo sẽ gọi vào API này mỗi khi có người nhắn tin tới OA
export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // Bắt sự kiện khách hàng gửi tin nhắn chữ
    if (payload.event_name === 'user_send_text') {
      const senderId = payload.sender.id;
      const messageText = payload.message.text;
      const timestamp = payload.timestamp; // ms

      // 1. Cập nhật hoặc Tạo mới luồng chat (Conversation)
      const convRef = doc(db, 'conversations', senderId);
      
      await setDoc(convRef, {
        platform: 'Zalo',
        customerName: 'Zalo User ' + senderId.substring(0, 5), // Tên tạm, Zalo ẩn tên thật nếu chưa cấp quyền
        customerPhone: '',
        lastMessage: messageText,
        lastMessageTime: new Date(parseInt(timestamp)).toISOString(),
        unreadCount: increment(1), // Tăng số tin chưa đọc lên 1
        updatedAt: new Date(parseInt(timestamp)).toISOString()
      }, { merge: true });

      // 2. Lưu nội dung tin nhắn vào CSDL
      await addDoc(collection(db, 'messages'), {
        conversationId: senderId,
        text: messageText,
        senderId: senderId,
        type: 'inbound',
        createdAt: new Date(parseInt(timestamp)).toISOString()
      });
      
      console.log('Đã lưu tin nhắn Zalo thành công!');
    }

    // Luôn trả về 200 OK để Zalo biết server mình vẫn sống
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Lỗi nhận Webhook Zalo:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

// Zalo thi thoảng ping thử GET request
export async function GET() {
  return NextResponse.json({ status: 'Webhook is running' }, { status: 200 });
}
