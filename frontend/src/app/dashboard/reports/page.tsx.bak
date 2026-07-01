'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { reportApi, employeeApi } from '@/lib/api';
import { FileText, Paperclip, CheckCircle, Upload, Plus } from 'lucide-react';
import { getISOWeek, getYear } from 'date-fns';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDisplayUrl = (filePath: string) => {
  if (!filePath) return '';
  if (filePath.startsWith('blob:')) {
    return filePath;
  }
  if (filePath.includes('drive.google.com')) {
    const fileIdMatch = filePath.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || filePath.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/thumbnail?authuser=0&sz=s4000&id=${fileIdMatch[1]}`;
    }
  }
  return filePath;
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [filterDate, setFilterDate] = useState<string>(getLocalDateString());
  const [reports, setReports] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Submit Form state
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState<any>({ date: getLocalDateString(), content: '', progress: 100, week: getISOWeek(new Date()), nextPlan: '', targetNew: 0, targetContacted: 0, targetConsulting: 0, targetMeeting: 0, targetSigned: 0, evalNew: '', evalContacted: '', evalConsulting: '', evalMeeting: '', evalSigned: '', failureReasonAnalysis: '' });
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Feedback state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  useEffect(() => {
    if (isManagerOrAdmin) employeeApi.getAll().then(r => setEmployees(r.data)).catch(() => {});
  }, [isManagerOrAdmin]);

  const fetchReports = async () => {
    const cacheKey = `cached_reports_${selectedEmp}_${filterDate}`;
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const sorted = (parsed || []).sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setReports(sorted);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const params: any = isManagerOrAdmin && selectedEmp ? { employeeId: selectedEmp } : {};
      params.date = filterDate;
      const res = await reportApi.getDailyReports(params);
      const sorted = (res.data || []).sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
      setReports(sorted);
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(sorted));
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [selectedEmp, filterDate]);

  const submitFeedback = async (id: string) => {
    if (!feedbackText.trim()) return;
    const originalText = feedbackText;
    setReplyingTo(null);
    setFeedbackText('');

    // Optimistically update feedback
    setReports(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, adminFeedback: originalText };
      }
      return r;
    }));

    try {
      await reportApi.addDailyFeedback(id, originalText);
      fetchReports();
    } catch (err) {
      // Revert on error
      setReports(prev => prev.map(r => {
        if (r.id === id) {
          return { ...r, adminFeedback: '' };
        }
        return r;
      }));
      console.error("Firebase Error:", err);
      alert('Lỗi gửi phản hồi: ' + ((err as any)?.message || 'Unknown error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const tempId = 'temp-' + Date.now();
    const tempReport = {
      id: tempId,
      type: 'Daily',
      employeeId: user?.id || '',
      employeeName: user?.fullName || 'Tôi',
      date: form.date,
      content: form.content,
      progressPercentage: form.progress,
      targetNew: form.targetNew || 0,
      targetContacted: form.targetContacted || 0,
      targetConsulting: form.targetConsulting || 0,
      targetMeeting: form.targetMeeting || 0,
      targetSigned: form.targetSigned || 0,
      evalNew: form.evalNew || '',
      evalContacted: form.evalContacted || '',
      evalConsulting: form.evalConsulting || '',
      evalMeeting: form.evalMeeting || '',
      evalSigned: form.evalSigned || '',
      failureReasonAnalysis: form.failureReasonAnalysis || '',
      feedback: '',
      adminFeedback: '',
      attachments: file ? [{
        id: 'temp-att-' + tempId,
        fileName: file.name,
        filePath: URL.createObjectURL(file),
        fileType: file.type
      }] : [],
      createdAt: new Date().toISOString(),
      isSubmitting: true
    };

    setShowSubmit(false);
    const submittedFile = file;
    setFile(null);
    setForm({ date: getLocalDateString(), content: '', progress: 100, week: getISOWeek(new Date()), nextPlan: '', targetNew: 0, targetContacted: 0, targetConsulting: 0, targetMeeting: 0, targetSigned: 0, evalNew: '', evalContacted: '', evalConsulting: '', evalMeeting: '', evalSigned: '', failureReasonAnalysis: '' });

    if (filterDate === tempReport.date && (!selectedEmp || selectedEmp === user?.id)) {
      setReports(prev => [tempReport, ...prev]);
    }

    try {
      const payload: any = { ...tempReport };
      delete payload.isSubmitting;
      if (submittedFile) {
        const formData = new FormData();
        formData.append('file', submittedFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          payload.attachments = [{ fileName: submittedFile.name, filePath: uploadData.url || uploadData.fileUrl, fileType: submittedFile.type }];
        } else {
          throw new Error('Lỗi upload file: ' + uploadData.error);
        }
      } else {
        payload.attachments = [];
      }
      await reportApi.createDailyReport(payload);
      
      const cacheKey = `cached_reports_${selectedEmp}_${filterDate}`;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(cacheKey);
      }
      fetchReports();
    } catch (err: any) {
      setReports(prev => prev.filter(r => r.id !== tempId));
      console.error("Submit Error:", err);
      alert(err.message || err.response?.data?.error || 'Lỗi nộp báo cáo');
    }
    setSubmitting(false);
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Báo cáo Ngày</h1>
          <p className="page-subtitle">Nhật ký hoạt động hằng ngày</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSubmit(true)}><Plus size={16} /> Nộp báo cáo</button>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <input 
          type="date" 
          className="form-input" 
          style={{ width: 180 }} 
          value={filterDate} 
          onChange={e => setFilterDate(e.target.value)} 
          title="Chọn ngày xem báo cáo"
        />

        {isManagerOrAdmin && (
          <select className="form-input" style={{ width: 240 }} value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
            <option value="">-- Tất cả nhân viên --</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
          </select>
        )}
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reports.map((r, i) => (
              <div key={r.id || i} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', opacity: r.isSubmitting ? 0.7 : 1, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, background: 'var(--accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                      {r.employeeName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.employeeName}
                        {r.isSubmitting && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
                        {r.isSubmitting && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(Đang gửi...)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {new Date(r.date).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                  <div style={{ width: 120 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Tiến độ</span>
                      <span style={{ color: r.progressPercentage === 100 ? 'var(--accent-green)' : 'var(--accent-blue)', fontWeight: 700 }}>{r.progressPercentage}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 6 }}>
                      <div className="progress-fill" style={{ width: `${r.progressPercentage}%`, background: r.progressPercentage === 100 ? 'var(--accent-green)' : 'var(--accent-blue)' }} />
                    </div>
                  </div>
                </div>
                
                <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap', marginBottom: r.nextWeekPlan ? 12 : 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, fontSize: 12, textTransform: 'uppercase' }}>Nội dung công việc</div>
                  {r.content}
                </div>

                {r.attachments && r.attachments.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {r.attachments.map((a: any) => {
                      const isImage = a.fileType?.startsWith('image/') || 
                                      a.fileName?.match(/\.(jpeg|jpg|gif|png)$/i) ||
                                      a.filePath?.includes('mime=image') ||
                                      a.filePath?.match(/[?&]name=.*?\.(jpeg|jpg|gif|png)/i) ||
                                      (a.filePath?.includes('drive.google.com') && 
                                       !a.fileName?.match(/\.(pdf|docx|doc|xlsx|xls|zip|rar)$/i) && 
                                       !a.filePath?.includes('mime=application'));
                      const fileUrl = a.filePath;
                      const displayUrl = getDisplayUrl(a.filePath);
                      return isImage ? (
                        <a key={a.id} href={fileUrl} target="_blank" rel="noreferrer" style={{ display: 'block', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                          <img src={displayUrl} alt={a.fileName} style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain', display: 'block' }} />
                        </a>
                      ) : (
                        <a key={a.id} href={fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--bg-hover)', borderRadius: 20, border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-primary)', textDecoration: 'none' }}>
                          <Paperclip size={14} color="var(--accent-blue)" /> {a.fileName}
                        </a>
                      );
                    })}
                  </div>
                )}

                {r.adminFeedback && (
                  <div style={{ padding: 12, marginTop: 12, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-orange)', marginBottom: 4, fontSize: 12, textTransform: 'uppercase' }}>Nhận xét của Quản lý</div>
                    {r.adminFeedback}
                  </div>
                )}

                {isManagerOrAdmin && replyingTo !== r.id && (
                  <button className="btn" style={{ marginTop: 12, background: 'var(--bg-hover)', border: 'none', fontSize: 13 }} onClick={() => { setReplyingTo(r.id); setFeedbackText(r.adminFeedback || ''); }}>
                    {r.adminFeedback ? 'Sửa nhận xét / Phản hồi' : 'Thêm nhận xét / Phản hồi'}
                  </button>
                )}

                {replyingTo === r.id && (
                  <div style={{ marginTop: 12 }}>
                    <textarea 
                      className="form-input" 
                      style={{ minHeight: 80, width: '100%', marginBottom: 8 }} 
                      placeholder="Nhập nội dung phản hồi..." 
                      value={feedbackText} 
                      onChange={e => setFeedbackText(e.target.value)} 
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => submitFeedback(r.id)} disabled={submittingFeedback}>Gửi phản hồi</button>
                      <button className="btn" onClick={() => setReplyingTo(null)} disabled={submittingFeedback}>Hủy</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {reports.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Chưa có báo cáo nào.</div>}
          </div>
        )}
      </div>

      {showSubmit && (
        <div className="modal-overlay" onClick={() => setShowSubmit(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Nộp Báo Cáo Ngày</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div><label className="form-label">Ngày báo cáo</label><input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
                    <div>
                      <label className="form-label">Tiến độ công việc ({form.progress}%)</label>
                      <input type="range" min="0" max="100" step="5" style={{ width: '100%', accentColor: 'var(--accent-blue)' }} value={form.progress} onChange={e => setForm({...form, progress: parseInt(e.target.value)})} />
                    </div>

                <div><label className="form-label">Nội dung công việc đã làm *</label><textarea className="form-input" rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} required placeholder="Liệt kê các đầu việc đã thực hiện..." /></div>



                <div>
                  <label className="form-label">File đính kèm (Ảnh/Tài liệu)</label>
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, border: '2px dashed var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-hover)' }}>
                    <Upload size={24} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{file ? file.name : 'Click để chọn file'}</span>
                    <input type="file" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowSubmit(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <><CheckCircle size={16} /> Gửi Báo Cáo</>}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
