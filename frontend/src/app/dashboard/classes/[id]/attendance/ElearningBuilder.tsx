import { useState } from 'react';
import { classApi } from '@/lib/api';
import { PlayCircle, FileText, CheckCircle, Plus, Trash2, Save, Edit2, X, Video } from 'lucide-react';

export default function ElearningBuilder({ classId, initialSessions, onSessionsUpdated }: { classId: string, initialSessions: any[], onSessionsUpdated: (sessions: any[]) => void }) {
  const [sessions, setSessions] = useState<any[]>(initialSessions || []);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    topic: '',
    description: '',
    videoUrl: '',
    lessonType: 'video' // 'video' or 'test'
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({ topic: '', description: '', videoUrl: '', lessonType: 'video' });
    setShowModal(true);
  };

  const handleOpenEdit = (s: any) => {
    setEditingId(s.id);
    setForm({ 
      topic: s.topic || '', 
      description: s.description || '', 
      videoUrl: s.videoUrl || '', 
      lessonType: s.lessonType || 'video'
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa bài học này?')) return;
    setLoading(true);
    try {
      await classApi.deleteSession(id);
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      onSessionsUpdated(newSessions);
    } catch (e) {
      console.error(e);
      alert('Lỗi xóa bài học');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.topic) return alert('Vui lòng nhập tên bài học');
    setLoading(true);
    try {
      if (editingId) {
        await classApi.updateSession(editingId, form);
        const newSessions = sessions.map(s => s.id === editingId ? { ...s, ...form } : s);
        setSessions(newSessions);
        onSessionsUpdated(newSessions);
      } else {
        const newSession = { 
          classId, 
          date: new Date().toISOString(), 
          order: sessions.length + 1, 
          ...form 
        };
        const res = await classApi.createSession(classId, newSession);
        const finalSession = { id: res.data?.id, ...newSession };
        const newSessions = [...sessions, finalSession];
        setSessions(newSessions);
        onSessionsUpdated(newSessions);
      }
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert('Lỗi lưu bài học');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Video color="var(--accent-blue)" /> Giáo trình E-Learning
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Kéo thả hoặc thêm mới các bài học Video và Bài kiểm tra vào khóa học này.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          <Plus size={16} /> Thêm Bài học mới
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-secondary)', borderRadius: 12, color: 'var(--text-muted)' }}>
            Chưa có bài học nào trong giáo trình. Bấm "Thêm Bài học mới" để bắt đầu.
          </div>
        ) : (
          sessions.map((s, idx) => (
            <div key={s.id} className="glass-card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: s.lessonType === 'test' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 122, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.lessonType === 'test' ? 'var(--accent-red)' : 'var(--accent-blue)', fontWeight: 700 }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.lessonType === 'test' ? <FileText size={16} color="var(--accent-red)" /> : <PlayCircle size={16} color="var(--accent-blue)" />}
                  {s.topic}
                </h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {s.lessonType === 'test' ? 'Bài kiểm tra đánh giá năng lực' : `Video URL: ${s.videoUrl || 'Chưa cập nhật'}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-icon" onClick={() => handleOpenEdit(s)} title="Chỉnh sửa"><Edit2 size={18} /></button>
                <button className="btn-icon" onClick={() => handleDelete(s.id)} title="Xóa"><Trash2 size={18} color="var(--accent-red)" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => !loading && setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>{editingId ? 'Sửa bài học' : 'Thêm Bài học mới'}</h3>
              <button className="btn-icon" onClick={() => !loading && setShowModal(false)}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Loại học liệu</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="lessonType" checked={form.lessonType === 'video'} onChange={() => setForm({...form, lessonType: 'video'})} /> Video bài giảng
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="lessonType" checked={form.lessonType === 'test'} onChange={() => setForm({...form, lessonType: 'test'})} /> Bài kiểm tra (Test)
                  </label>
                </div>
              </div>

              <div>
                <label className="form-label">Tên {form.lessonType === 'test' ? 'Bài kiểm tra' : 'Bài học'}</label>
                <input className="form-input" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} placeholder="VD: Bài 1: Giới thiệu tổng quan..." />
              </div>

              {form.lessonType === 'video' && (
                <div>
                  <label className="form-label">Đường dẫn Video (YouTube / Vimeo URL)</label>
                  <input className="form-input" value={form.videoUrl} onChange={e => setForm({...form, videoUrl: e.target.value})} placeholder="https://youtube.com/watch?v=..." />
                </div>
              )}

              <div>
                <label className="form-label">Mô tả / Thông tin chi tiết</label>
                <textarea className="form-input" rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Nhập nội dung mô tả, tóm tắt ý chính của bài học này..."></textarea>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? <span className="spinner"></span> : <Save size={16} />} Lưu {form.lessonType === 'test' ? 'bài kiểm tra' : 'bài học'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
