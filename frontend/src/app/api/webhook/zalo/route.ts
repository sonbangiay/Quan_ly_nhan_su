import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, increment } from 'firebase/firestore';

// Zalo sẽ gọi vào API này mỗi khi có người nhắn tin tới OA
export async function POST(request: Request) {
  try {
    const rawText = await request.text();
    let payload: any = {};
    if (rawText) {
      try {
        payload = JSON.parse(rawText);
      } catch (e) {}
    }

    const eventName = payload?.event_name;

    if (eventName === 'user_send_text' || eventName === 'user_send_image' || eventName === 'user_send_sticker') {
      const senderId = payload.sender?.id || '';
      const timestamp = payload.timestamp || Date.now(); // ms
      
      let messageText = '';
      let imageUrl = '';
      let stickerUrl = '';

      if (eventName === 'user_send_text') {
        messageText = payload.message?.text || '';
      } else if (eventName === 'user_send_image') {
        messageText = '[Hình ảnh]';
        // Zalo often sends image in attachments
        const attachments = payload.message?.attachments;
        if (attachments && attachments.length > 0 && attachments[0].type === 'image') {
          imageUrl = attachments[0].payload?.url || '';
        }
      } else if (eventName === 'user_send_sticker') {
        messageText = '[Sticker]';
        // Sticker usually has URL in attachments
        const attachments = payload.message?.attachments;
        if (attachments && attachments.length > 0 && attachments[0].type === 'sticker') {
          stickerUrl = attachments[0].payload?.url || '';
        }
      }

      // Lấy Profile khách hàng từ Zalo nếu cần
      let customerName = 'Zalo User ' + senderId.substring(0, 5);
      let customerAvatar = '';
      
      try {
        const { getZaloProfile } = await import('@/lib/zalo');
        const profile = await getZaloProfile(senderId);
        if (profile) {
          customerName = profile.display_name || customerName;
          customerAvatar = profile.avatar || '';
        }
      } catch (e) {
        console.error('Không thể lấy Zalo profile:', e);
      }

      // 1. Cập nhật hoặc Tạo mới luồng chat (Conversation)
      const convRef = doc(db, 'conversations', senderId);
      
      await setDoc(convRef, {
        platform: 'Zalo',
        customerName: customerName,
        customerAvatar: customerAvatar,
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
        imageUrl: imageUrl,
        stickerUrl: stickerUrl,
        senderId: senderId,
        type: 'inbound',
        createdAt: new Date(parseInt(timestamp)).toISOString()
      });
      
      console.log(`Đã lưu tin nhắn Zalo (${eventName}) thành công!`);
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
