'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { classApi, classLessonsApi, classMaterialsApi } from '@/lib/api';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ArrowLeft, Plus, BookOpen, FileText, Video, Link as LinkIcon, 
  Trash2, Download, UploadCloud, Calendar, Clock, Loader2, MoreVertical 
} from 'lucide-react';

export default function ClassMaterialsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();
  
  const [classData, setClassData] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lesson Modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({ lessonNumber: 1, title: '', date: '', description: '' });
  const [savingLesson, setSavingLesson] = useState(false);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'file'|'link'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const clsRes = await classApi.getById(id);
      setClassData(clsRes.data);
      
      const lessRes = await classLessonsApi.getLessons(id);
      setLessons(lessRes.data || []);
      if (lessRes.data && lessRes.data.length > 0) {
        setSelectedLesson(lessRes.data[0]);
        loadMaterials(lessRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const loadMaterials = async (lessonId: string) => {
    try {
      const res = await classMaterialsApi.getMaterials(lessonId);
      setMaterials(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLessonSelect = (lesson: any) => {
    setSelectedLesson(lesson);
    loadMaterials(lesson.id);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLesson(true);
    try {
      await classLessonsApi.createLesson({
        classId: id,
        ...lessonForm
      });
      setShowLessonModal(false);
      loadData();
    } catch (e) {
      alert('Lỗi tạo buổi học');
    }
    setSavingLesson(false);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Bạn có chắc muốn xoá buổi học này cùng toàn bộ tài liệu bên trong?')) return;
    try {
      await classLessonsApi.deleteLesson(lessonId);
      if (selectedLesson?.id === lessonId) setSelectedLesson(null);
      loadData();
    } catch (e) {}
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLesson) return;
    setUploading(true);

    try {
      let fileUrl = '';
      let type = 'link';
      let name = fileName;

      if (uploadType === 'file' && file) {
        const fileRef = ref(storage, `classes/${id}/lessons/${selectedLesson.id}/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        fileUrl = await getDownloadURL(fileRef);
        type = file.type.includes('video') ? 'video' : file.type.includes('pdf') ? 'pdf' : 'doc';
        if (!name) name = file.name;
      } else if (uploadType === 'link' && linkUrl) {
        fileUrl = linkUrl;
        if (fileUrl.includes('youtube') || fileUrl.includes('youtu.be')) type = 'video';
        if (!name) name = fileUrl;
      }

      await classMaterialsApi.createMaterial({
        lessonId: selectedLesson.id,
        fileName: name,
        fileUrl,
        fileType: type,
        uploadedBy: user?.fullName || 'Admin',
      });

      setShowUploadModal(false);
      setFile(null); setLinkUrl(''); setFileName('');
      loadMaterials(selectedLesson.id);
    } catch (e) {
      alert('Upload lỗi. Vui lòng thử lại.');
    }
    setUploading(false);
  };

  const handleDeleteMaterial = async (matId: string) => {
    if (!confirm('Xoá tài liệu này?')) return;
    try {
      await classMaterialsApi.deleteMaterial(matId);
      loadMaterials(selectedLesson.id);
    } catch (e) {}
  };

  const getFileIcon = (type: string) => {
    if (type === 'pdf') return <FileText size={20} color="#ef4444" />;
    if (type === 'video') return <Video size={20} color="#3b82f6" />;
    if (type === 'link') return <LinkIcon size={20} color="#10b981" />;
    return <FileText size={20} color="#6366f1" />;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spinner" size={32} style={{ display: 'inline-block' }} /></div>;
  if (!classData) return <div>Lớp không tồn tại</div>;

  return (
    <div className="section animate-fadeInUp">


      <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 200px)', minHeight: 600 }}>
        {/* Cột trái: Lộ trình (Lessons) */}
        <div className="glass-card" style={{ width: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Lộ trình học</h3>
            <button className="btn btn-primary btn-sm" style={{ padding: '6px' }} onClick={() => {
              setLessonForm({ lessonNumber: lessons.length + 1, title: '', date: '', description: '' });
              setShowLessonModal(true);
            }}><Plus size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lessons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có buổi học nào</div>
            ) : (
              lessons.map(lesson => (
                <div 
                  key={lesson.id} 
                  onClick={() => handleLessonSelect(lesson)}
                  style={{ 
                    padding: 12, borderRadius: 8, cursor: 'pointer',
                    background: selectedLesson?.id === lesson.id ? 'rgba(0, 104, 255, 0.1)' : 'transparent',
                    border: `1px solid ${selectedLesson?.id === lesson.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                    transition: 'all 0.2s', position: 'relative'
                  }}
                  className="lesson-item hover-bg"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: selectedLesson?.id === lesson.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      Buổi {lesson.lessonNumber}: {lesson.title}
                    </div>
                    <button 
                      className="btn-icon text-danger" 
                      style={{ padding: 2, background: 'none', border: 'none', opacity: selectedLesson?.id === lesson.id ? 1 : 0.3 }}
                      onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {lesson.date && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {lesson.date}</div>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cột phải: Tài liệu của Buổi (Materials) */}
        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedLesson ? (
            <>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Buổi {selectedLesson.lessonNumber}: {selectedLesson.title}</h2>
                    {selectedLesson.description && <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>{selectedLesson.description}</p>}
                  </div>
                  <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                    <UploadCloud size={16} /> Thêm tài liệu
                  </button>
                </div>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Tài liệu đính kèm ({materials.length})</h3>
                {materials.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    <UploadCloud size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <div>Chưa có tài liệu nào cho buổi học này</div>
                    <div style={{ fontSize: 13, marginTop: 4 }}>Bấm "Thêm tài liệu" để upload file PDF, Video hoặc gắn Link</div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {materials.map(mat => (
                      <div key={mat.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, background: 'var(--bg-card)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {getFileIcon(mat.fileType)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a href={mat.fileUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }} className="hover-text-blue">
                            {mat.fileName}
                          </a>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bởi {mat.uploadedBy}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <a href={mat.fileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: 6 }}><Download size={14} /></a>
                          <button className="btn btn-danger btn-sm" style={{ padding: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }} onClick={() => handleDeleteMaterial(mat.id)}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)' }}>
              <BookOpen size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <div>Chọn một buổi học bên trái để xem tài liệu</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Them Buoi Hoc */}
      {showLessonModal && (
        <div className="modal-overlay" onClick={() => setShowLessonModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Thêm Buổi học mới</h2>
            <form onSubmit={handleSaveLesson}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
                  <div><label className="form-label">Buổi số *</label><input type="number" className="form-input" value={lessonForm.lessonNumber} onChange={e => setLessonForm({...lessonForm, lessonNumber: Number(e.target.value)})} required /></div>
                  <div><label className="form-label">Tên buổi học (Chủ đề) *</label><input className="form-input" placeholder="VD: Nhập môn N5..." value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} required /></div>
                </div>
                <div><label className="form-label">Ngày dự kiến học (Tuỳ chọn)</label><input type="date" className="form-input" value={lessonForm.date} onChange={e => setLessonForm({...lessonForm, date: e.target.value})} /></div>
                <div><label className="form-label">Mô tả ngắn (Tuỳ chọn)</label><textarea className="form-input" rows={2} value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLessonModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={savingLesson}>{savingLesson ? <Loader2 size={16} className="spinner" /> : 'Lưu lộ trình'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload Tai Lieu */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 450 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Thêm tài liệu cho Buổi {selectedLesson?.lessonNumber}</h2>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-secondary)', padding: 4, borderRadius: 8 }}>
              <button className={`btn ${uploadType === 'file' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: uploadType === 'file' ? 'var(--accent-blue)' : 'transparent' }} onClick={() => setUploadType('file')} type="button">Tải File lên</button>
              <button className={`btn ${uploadType === 'link' ? 'btn-primary' : ''}`} style={{ flex: 1, border: 'none', background: uploadType === 'link' ? 'var(--accent-blue)' : 'transparent' }} onClick={() => setUploadType('link')} type="button">Gắn Link (URL)</button>
            </div>

            <form onSubmit={handleUploadSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Tên tài liệu hiển thị</label>
                  <input className="form-input" placeholder="VD: Slide bài 1 (Bỏ trống tự lấy tên file/link)" value={fileName} onChange={e => setFileName(e.target.value)} />
                </div>
                
                {uploadType === 'file' ? (
                  <div>
                    <label className="form-label">Chọn File (PDF, Word, MP4, JPEG...)</label>
                    <div 
                      style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 30, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {file ? (
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</div>
                      ) : (
                        <div style={{ color: 'var(--text-secondary)' }}><UploadCloud size={24} style={{ margin: '0 auto 8px' }}/> Bấm để chọn file</div>
                      )}
                    </div>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                  </div>
                ) : (
                  <div>
                    <label className="form-label">Đường dẫn URL (Youtube, Google Drive...)</label>
                    <input className="form-input" placeholder="https://..." value={linkUrl} onChange={e => setLinkUrl(e.target.value)} required />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || (uploadType==='file' && !file) || (uploadType==='link' && !linkUrl)}>
                  {uploading ? <><Loader2 size={16} className="spinner" /> Đang xử lý...</> : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
