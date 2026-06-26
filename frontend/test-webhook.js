const http = require('http');

const payload = {
  event_name: 'user_send_text',
  sender: { id: '3448408906979669522' }, // Một ID giả lập hoặc ID thực của họ. Chờ chút, ID của Lê Trung Kiệt là gì?
  // Trong route.ts, senderId được parse.
  // Ta sẽ gửi 1 webhook giả tới localhost:3000
};

// Nhưng để chính xác, mình cần lấy senderId thực tế từ Firebase để nó gửi đúng vào cuộc trò chuyện của họ.
// Mình sẽ dùng ID mặc định tạm, hoặc lấy ID nào đó.
