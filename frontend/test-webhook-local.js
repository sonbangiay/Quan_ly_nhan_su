const payload = {
  event_name: 'user_send_text',
  sender: { id: '1234567890' }, // ID giả định
  timestamp: Date.now().toString(),
  message: { text: 'Tôi cần tư vấn tiếng hàn' }
};

fetch('http://localhost:3000/api/webhook/zalo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => console.log('Webhook test response:', data))
.catch(err => console.error('Error:', err));
