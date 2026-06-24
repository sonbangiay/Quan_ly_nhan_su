import { NextResponse } from 'next/server';
import { sendZaloMessage } from '@/lib/zalo';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { senderId, text, userId, userName } = await request.json();

    if (!senderId || !text) {
      return NextResponse.json({ success: false, message: 'Thiếu thông tin người nhận hoặc nội dung' }, { status: 400 });
    }

    // 1. Gọi Zalo API để gửi tin nhắn
    await sendZaloMessage(senderId, text);

    // 2. Lưu vào CSDL
    await addDoc(collection(db, 'messages'), {
      conversationId: senderId,
      text: text,
      senderId: userId || 'admin',
      senderName: userName || 'Quản trị viên',
      type: 'outbound',
      createdAt: new Date().toISOString()
    });

    // 3. Cập nhật conversation
    const convRef = doc(db, 'conversations', senderId);
    await setDoc(convRef, {
      lastMessage: text,
      lastMessageTime: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Lỗi API gửi Zalo:', error);
    return NextResponse.json({ success: false, message: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
