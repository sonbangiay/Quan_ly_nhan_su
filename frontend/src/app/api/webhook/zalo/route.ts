import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, increment, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

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
      let msgId = payload.message?.msg_id || timestamp.toString();

      // Deduplication: Kiểm tra xem tin nhắn này đã được xử lý chưa
      try {
        const { getDoc } = await import('firebase/firestore');
        const processedRef = doc(db, 'processed_messages', msgId);
        const processedSnap = await getDoc(processedRef);
        if (processedSnap.exists()) {
          console.log('Tin nhắn này đã được xử lý, bỏ qua retry từ Zalo:', msgId);
          return NextResponse.json({ success: true }, { status: 200 });
        }
        await setDoc(processedRef, { processedAt: new Date().toISOString() });
      } catch (e) {
        console.error('Lỗi check deduplication:', e);
      }

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

      // Lấy Profile khách hàng từ Zalo qua PHP Proxy Việt Nam (iNET)
      // Gửi token qua POST body (tránh WAF chặn URL dài)
      let customerName = 'Zalo User ' + senderId.substring(0, 5);
      let customerAvatar = '';
      
      try {
        const { getZaloToken } = await import('@/lib/zalo');
        const token = await getZaloToken();
        
        const proxyUrl = process.env.ZALO_PROXY_URL || 'https://nhanphuphuyen.edu.vn/zalo_proxy.php';
        const profileRes = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: senderId, access_token: token }),
          signal: AbortSignal.timeout(10000)
        });
        const profileData = await profileRes.json();
        
        if (profileData.error === 0 && profileData.data) {
          customerName = profileData.data.display_name || customerName;
          customerAvatar = profileData.data.avatar || '';
          console.log('Lấy Zalo profile thành công:', customerName);
        } else {
          console.error('Lỗi lấy Zalo profile từ proxy:', JSON.stringify(profileData));
        }
      } catch (e: any) {
        console.error('Không thể lấy Zalo profile:', e.message);
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
      
      // 3. Kiểm tra xem Bot có đang bật cho cuộc trò chuyện này không (Handoff logic)
      // Nếu không có field botEnabled thì mặc định là bật
      let botEnabled = true;
      try {
        const { getDoc } = await import('firebase/firestore');
        
        // Kiểm tra Global Bot Config trước
        const globalRef = doc(db, 'settings', 'ai_config');
        const globalSnap = await getDoc(globalRef);
        if (globalSnap.exists() && globalSnap.data().globalBotEnabled === false) {
          botEnabled = false;
          console.log('AI đang bị TẮT toàn cục (Global).');
        } else {
          // Nếu Global bật, kiểm tra tiếp Bot riêng cho cuộc trò chuyện này
          const convSnap = await getDoc(convRef);
          if (convSnap.exists() && convSnap.data().botEnabled === false) {
            botEnabled = false;
            console.log(`AI đang bị TẮT cho cuộc trò chuyện ${senderId}.`);
          }
        }
      } catch (e) {
        console.error('Lỗi check botEnabled:', e);
      }

      // 4. AI Tự động trả lời (nếu là tin nhắn văn bản và Bot đang bật)
      if (eventName === 'user_send_text' && messageText && botEnabled) {
        try {
          const { aiAgent } = await import('@/lib/aiAgent');
          // Lấy AI Prompt từ cấu hình hệ thống
          const defaultPrompt = 'Bạn là trợ lý AI thông minh của trung tâm Nhân Phú. Hãy dựa vào tài liệu được cung cấp để trả lời khách hàng ngắn gọn, thân thiện và chính xác.';
          
          // 4.1 Lấy lịch sử trò chuyện (Memory) để AI thông minh hơn
          let history = '';
          try {
            const q = query(collection(db, 'messages'), where('conversationId', '==', senderId), orderBy('createdAt', 'desc'), limit(6));
            const querySnapshot = await getDocs(q);
            const msgs = querySnapshot.docs.map(d => d.data()).reverse(); // Sắp xếp từ cũ đến mới (câu hiện tại ở cuối cùng)
            // Lọc ra các tin nhắn hợp lệ, tránh lỗi
            history = msgs.filter(m => m.text).map(m => `${m.senderId === senderId ? 'Khách hàng' : 'Tư vấn viên (AI)'}: ${m.text}`).join('\n');
          } catch (e) {
            console.error('Lỗi lấy lịch sử chat:', e);
          }

          console.log('Đang nhờ AI sinh câu trả lời...');
          const aiResponseObj = await aiAgent.generateResponse(messageText, defaultPrompt, senderId, history);
          
          // Xử lý Function Call
          let aiText = '';
          if (typeof aiResponseObj === 'string') {
            // Trường hợp lỗi hoặc fallback
            aiText = aiResponseObj;
          } else {
            aiText = aiResponseObj.text;
            
            if (aiResponseObj.type === 'function_call') {
              if (aiResponseObj.function === 'bookAppointment') {
                const { customerName, appointmentTime, note } = aiResponseObj.args as any;
                // Lưu lịch hẹn vào DB
                await addDoc(collection(db, 'appointments'), {
                  customerId: senderId,
                  customerName: customerName || customerName,
                  time: appointmentTime,
                  note: note || '',
                  status: 'pending',
                  source: 'zalo_ai',
                  createdAt: new Date().toISOString()
                });
                console.log(`[AI Function] Đã lưu lịch hẹn cho ${customerName} vào lúc ${appointmentTime}`);
              }
              else if (aiResponseObj.function === 'handoffToHuman') {
                // Tắt Bot cho cuộc trò chuyện này
                await setDoc(convRef, {
                  botEnabled: false,
                  requiresAttention: true // Đánh dấu cần nhân viên chú ý
                }, { merge: true });
                console.log(`[AI Function] Đã tắt Bot và chuyển giao cho Người thật (Sender: ${senderId})`);
              }
            }
          }

          // Lưu tin nhắn của AI vào CSDL TRƯỚC khi gửi Zalo để đảm bảo luôn hiện trên UI
          await addDoc(collection(db, 'messages'), {
            conversationId: senderId,
            text: aiText,
            imageUrl: '',
            senderId: 'ai-agent',
            senderName: 'Trợ lý AI Nhân Phú',
            type: 'outbound',
            createdAt: new Date().toISOString()
          });

          // Cập nhật lastMessage
          await setDoc(convRef, {
            lastMessage: aiText,
            lastMessageTime: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Gửi tin nhắn qua Zalo
          try {
            const { sendZaloMessage } = await import('@/lib/zalo');
            await sendZaloMessage(senderId, aiText);
            console.log(`Đã tự động phản hồi bằng AI tới ${customerName}`);
          } catch (zaloErr: any) {
            console.error('Lỗi gửi Zalo (nhưng đã lưu UI):', zaloErr.message);
          }
        } catch (aiError: any) {
          console.error('Lỗi khi AI trả lời:', aiError.message);
          
          // Ghi lỗi thẳng lên UI để dễ debug
          await addDoc(collection(db, 'messages'), {
            conversationId: senderId,
            text: `[Hệ thống báo lỗi AI]: ${aiError.message}. Vui lòng kiểm tra lại Vercel / API Keys.`,
            imageUrl: '',
            senderId: 'ai-agent',
            senderName: 'Trợ lý AI (Lỗi)',
            type: 'outbound',
            createdAt: new Date().toISOString()
          });
        }
      }
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
