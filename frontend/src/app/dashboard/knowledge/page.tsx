'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeApi } from '@/lib/api';
import { BookOpen, Search, FileText, Download, Video, Folder, Plus, Trash2, X } from 'lucide-react';

const CATEGORIES = [
  { id: 'sales', name: 'Kịch bản Sales & Tư vấn', icon: FileText },
  { id: 'product', name: 'Tài liệu Sản phẩm/Dịch vụ', icon: Folder },
  { id: 'training', name: 'Đào tạo nhân sự mới', icon: Video },
  { id: 'policy', name: 'Quy định & Chính sách', icon: BookOpen },
];

interface KnowledgeDocument {
  id: string;
  categoryId: string;
  title: string;
  author: string;
  fileUrl: string;
  readTime: string;
  views: number;
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', categoryId: 'sales', file: null as File | null });
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await knowledgeApi.getDocuments();
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file) return alert('Vui lòng chọn file');
    setSaving(true);

    try {
      // Simulate progress for UX
      setUploadProgress(20);
      const formData = new FormData();
      formData.append('file', form.file);

      setUploadProgress(50);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      setUploadProgress(80);
      
      if (!data.success) {
        throw new Error(data.error || 'Lỗi tải lên từ Server');
      }

      await knowledgeApi.createDocument({
        title: form.title,
        categoryId: form.categoryId,
        author: user?.fullName || 'Admin',
        fileUrl: data.fileUrl,
        readTime: '1 phút'
      });
      setUploadProgress(100);

      setShowAdd(false);
      setForm({ title: '', categoryId: 'sales', file: null });
      setUploadProgress(0);
      setSaving(false);
      fetchDocs();
    } catch (error: any) {
      alert('Lỗi khi upload file: ' + error.message);
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    try {
      await knowledgeApi.deleteDocument(id);
      fetchDocs();
    } catch {
      alert('Lỗi xóa tài liệu');
    }
  };

  const filteredArticles = documents.filter(a => {
    const matchCat = activeCategory === 'all' || a.categoryId === activeCategory;
    const matchSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const isAdmin = user?.role === 'Admin';

  const getCategoryCount = (catId: string) => documents.filter(d => d.categoryId === catId).length;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Kho tài liệu (Knowledge Base)</h1>
          <p className="page-subtitle">Trung tâm lưu trữ tri thức, kịch bản và quy định nội bộ</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Tải lên tài liệu
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Sidebar Categories */}
        <div className="glass-card" style={{ width: 280, padding: 20, flexShrink: 0 }}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Tìm kiếm tài liệu..." 
              style={{ paddingLeft: 40, width: '100%' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Danh mục tài liệu</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: activeCategory === 'all' ? 'var(--bg-hover)' : 'transparent', color: activeCategory === 'all' ? 'var(--accent-blue)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', fontWeight: activeCategory === 'all' ? 600 : 500 }}
              onClick={() => setActiveCategory('all')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BookOpen size={18} />
                <span>Tất cả tài liệu</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{documents.length}</span>
            </button>

            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button 
                  key={cat.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: isActive ? 'var(--bg-hover)' : 'transparent', color: isActive ? 'var(--accent-blue)' : 'var(--text-primary)', border: 'none', cursor: 'pointer', fontWeight: isActive ? 600 : 500 }}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={18} />
                    <span>{cat.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getCategoryCount(cat.id)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
             <div style={{ padding: 60, textAlign: 'center' }}>
               <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} />
               <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Đang tải tài liệu...</p>
             </div>
          ) : filteredArticles.length === 0 ? (
            <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              <BookOpen size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
              <p>Không tìm thấy tài liệu nào phù hợp.</p>
            </div>
          ) : (
            filteredArticles.map(article => (
              <div key={article.id} className="glass-card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'center', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-secondary)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {article.categoryId === 'sales' ? <FileText size={24} /> : article.categoryId === 'training' ? <Video size={24} /> : <BookOpen size={24} />}
                </div>
                <div style={{ flex: 1 }} onClick={() => window.open(article.fileUrl, '_blank')}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{article.title}</h3>
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                    <span>Đăng bởi: {article.author}</span>
                    <span>•</span>
                    <span>Cập nhật: {new Date(article.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" style={{ padding: '8px 12px' }} onClick={() => window.open(article.fileUrl, '_blank')}>
                    <Download size={16} /> Tải về
                  </button>
                  {isAdmin && (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '8px', color: 'var(--accent-red)' }} onClick={() => handleDelete(article.id)} title="Xóa tài liệu">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => !saving && setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Tải lên tài liệu mới</h2>
              {!saving && <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowAdd(false)}><X size={20} /></button>}
            </div>
            
            <form onSubmit={handleUpload}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Tên tài liệu *</label>
                  <input 
                    className="form-input" 
                    value={form.title} 
                    onChange={e => setForm({...form, title: e.target.value})} 
                    placeholder="VD: Kịch bản chốt sale 2026..."
                    required 
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="form-label">Danh mục *</label>
                  <select 
                    className="form-input" 
                    value={form.categoryId} 
                    onChange={e => setForm({...form, categoryId: e.target.value})}
                    disabled={saving}
                  >
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Chọn File (PDF, DOCX, Video,...) *</label>
                  <input 
                    type="file" 
                    className="form-input" 
                    style={{ padding: '8px' }}
                    onChange={e => setForm({...form, file: e.target.files?.[0] || null})} 
                    required 
                    disabled={saving}
                  />
                </div>

                {saving && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                      <span>Đang tải lên...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${uploadProgress}%`, background: 'var(--accent-blue)', transition: 'width 0.2s' }} />
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Tải lên & Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
