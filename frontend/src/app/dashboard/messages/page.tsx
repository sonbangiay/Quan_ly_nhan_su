'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { chatApi, crmApi } from '@/lib/api';
import { 
  MessageSquare, Send, Phone, User, Calendar, PlusCircle, 
  Search, Filter, CheckCircle2, MoreVertical, Paperclip, Smile
} from 'lucide-react';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [matchedLead, setMatchedLead] = useState<any | null>(null);
  const [loadingConv, setLoadingConv] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Zalo' | 'Facebook'>('All');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations via onSnapshot to get realtime updates (when new messages arrive from Webhook)
  useEffect(() => {
    const q = collection(db, 'conversations');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
      setConversations(data);
      setLoadingConv(false);
    });

    return () => unsubscribe();
  }, []);

  // Load messages realtime when a conversation is selected
  useEffect(() => {
    if (!selectedConv) {
      setMessages([]);
      return;
    }
    
    // Mark as read
    if (selectedConv.unreadCount > 0) {
      chatApi.markAsRead(selectedConv.id).catch(console.error);
    }

    const q = query(collection(db, 'messages'), where('conversationId', '==', selectedConv.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(data);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [selectedConv?.id]);

  // Try to match conversation with a lead in CRM
  useEffect(() => {
    if (selectedConv?.customerPhone) {
      crmApi.getLeads().then(res => {
        const leads = res.data || [];
        const match = leads.find((l: any) => l.phone === selectedConv.customerPhone);
        setMatchedLead(match || null);
      });
    } else {
      setMatchedLead(null);
    }
  }, [selectedConv]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConv || !user) return;
    
    const text = messageText;
    setMessageText(''); // Optimistic clear

    try {
      await chatApi.sendMessage(selectedConv.id, text, user.id, user.fullName, selectedConv.platform);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn', err);
      alert('Không thể gửi tin nhắn.');
    }
  };

  const handleCreateLead = async () => {
    if (!selectedConv) return;
    try {
      await crmApi.importLeads({
        leads: [{
          name: selectedConv.customerName,
          phone: selectedConv.customerPhone || '',
          source: selectedConv.platform, // FB or Zalo
          notes: 'Tạo từ Chat Đa kênh'
        }],
        employeeIds: user?.id ? [user.id] : []
      });
      alert('Tạo khách hàng tiềm năng thành công!');
      // Refresh lead match
      const res = await crmApi.getLeads();
      const leads = res.data || [];
      const match = leads.find((l: any) => l.phone === selectedConv.customerPhone || l.name === selectedConv.customerName);
      setMatchedLead(match || null);
    } catch (err) {
      alert('Lỗi tạo khách hàng.');
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', gap: 16 }}>
      
      {/* CỘT TRÁI: Danh sách hội thoại */}
      <div className="glass-card animate-fadeInUp" style={{ width: 340, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={20} color="var(--accent-blue)" /> Tin nhắn Đa kênh
          </h2>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['All', 'Zalo', 'Facebook'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                style={{
                  flex: 1, padding: '6px 0', fontSize: 12, fontWeight: 600, borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                  color: activeTab === tab ? 'white' : 'var(--text-secondary)'
                }}
              >
                {tab === 'All' ? 'Tất cả' : tab}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}><Search size={16} /></div>
            <input type="text" className="form-input" placeholder="Tìm tên, số điện thoại..." style={{ paddingLeft: 36 }} />
          </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConv ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <div>Chưa có tin nhắn nào</div>
            </div>
          ) : (
            conversations.filter(c => activeTab === 'All' || c.platform === activeTab).map(conv => (
              <div 
                key={conv.id} 
                onClick={() => setSelectedConv(conv)}
                style={{ 
                  padding: '16px 20px', 
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  background: selectedConv?.id === conv.id ? 'var(--bg-hover)' : 'transparent',
                  display: 'flex', gap: 12, alignItems: 'center',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ position: 'relative' }}>
                  {conv.customerAvatar ? (
                    <img src={conv.customerAvatar} alt="" style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600 }}>
                      {conv.customerName?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Platform Icon Overlay */}
                  <div style={{ 
                    position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, 
                    background: conv.platform === 'Zalo' ? '#0068FF' : '#0866FF',
                    border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 10, fontWeight: 800
                  }}>
                    {conv.platform === 'Zalo' ? 'Z' : 'f'}
                  </div>
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: conv.unreadCount > 0 ? 700 : 600, fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.customerName}
                    </div>
                    <div style={{ fontSize: 11, color: conv.unreadCount > 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                      {conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: conv.unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: conv.unreadCount > 0 ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>
                      {conv.lastMessage || 'Chưa có tin nhắn'}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div style={{ background: 'var(--accent-red)', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CỘT GIỮA: Khung Chat */}
      <div className="glass-card animate-fadeInUp" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', animationDelay: '0.1s' }}>
        {selectedConv ? (
          <>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedConv.customerAvatar ? (
                  <img src={selectedConv.customerAvatar} alt="" style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>
                    {selectedConv.customerName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{selectedConv.customerName}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: 'var(--accent-green)' }}></span> Đang hoạt động trên {selectedConv.platform}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)' }}>
                <Filter size={18} cursor="pointer" />
                <MoreVertical size={18} cursor="pointer" />
              </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-primary)' }}>
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: 14 }}>Chưa có tin nhắn</div>
              ) : (
                messages.map((msg: any) => {
                  const isOutbound = msg.type === 'outbound';
                  return (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOutbound ? 'flex-end' : 'flex-start' }}>
                      <div style={{ 
                        maxWidth: '70%', 
                        padding: '10px 14px', 
                        borderRadius: 16, 
                        borderBottomRightRadius: isOutbound ? 4 : 16,
                        borderBottomLeftRadius: !isOutbound ? 4 : 16,
                        background: isOutbound ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                        color: isOutbound ? 'white' : 'var(--text-primary)',
                        fontSize: 14,
                        lineHeight: 1.5,
                        overflow: 'hidden'
                      }}>
                        {msg.imageUrl && <img src={msg.imageUrl} alt="Image" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: msg.text ? 8 : 0, display: 'block' }} />}
                        {msg.stickerUrl && <img src={msg.stickerUrl} alt="Sticker" style={{ width: 120, height: 120, objectFit: 'contain', display: 'block' }} />}
                        {msg.text && <div>{msg.text}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        {isOutbound && <span style={{ marginLeft: 4 }}>• {msg.senderName}</span>}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: 16, borderTop: '1px solid var(--border)' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Paperclip size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
                <Smile size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ flex: 1, borderRadius: 20, padding: '10px 16px' }}
                  placeholder={`Nhập tin nhắn trả lời ${selectedConv.customerName}...`}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" style={{ width: 40, height: 40, padding: 0, borderRadius: 20, justifyContent: 'center' }} disabled={!messageText.trim()}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>Chat Đa Kênh</h3>
            <p style={{ margin: 0 }}>Chọn một đoạn chat để bắt đầu trò chuyện</p>
          </div>
        )}
      </div>

      {/* CỘT PHẢI: CRM Info */}
      {selectedConv && (
        <div className="glass-card animate-fadeInUp" style={{ width: 300, padding: 24, display: 'flex', flexDirection: 'column', animationDelay: '0.2s' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 20px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Hồ sơ khách hàng</h3>
          
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {selectedConv.customerAvatar ? (
              <img src={selectedConv.customerAvatar} alt="" style={{ width: 72, height: 72, borderRadius: 36, objectFit: 'cover', margin: '0 auto 12px', display: 'block' }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, margin: '0 auto 12px' }}>
                {selectedConv.customerName?.charAt(0).toUpperCase()}
              </div>
            )}
            <h4 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>{selectedConv.customerName}</h4>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
              <span style={{ color: selectedConv.platform === 'Zalo' ? '#0068FF' : '#0866FF' }}>{selectedConv.platform}</span> User
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
              <Phone size={14} /> 
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedConv.customerPhone || 'Không có số ĐT'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
              <Calendar size={14} /> 
              <span style={{ color: 'var(--text-primary)' }}>Liên hệ lần đầu: {new Date(selectedConv.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          {matchedLead ? (
            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'rgba(52, 199, 89, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-green)', fontWeight: 600, marginBottom: 8 }}>
                <CheckCircle2 size={16} /> Đã có trong CRM
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Trạng thái: <strong style={{ color: 'var(--text-primary)' }}>{matchedLead.status}</strong>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}
                onClick={() => window.open('/dashboard/crm', '_blank')}
              >
                Mở thẻ khách hàng
              </button>
            </div>
          ) : (
            <div style={{ padding: 16, border: '1px dashed var(--border)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                Khách hàng này chưa có trong hệ thống CRM.
              </div>
              <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCreateLead}>
                <PlusCircle size={16} /> Tạo Khách hàng tiềm năng
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
