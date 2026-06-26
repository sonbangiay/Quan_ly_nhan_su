'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { crmApi, employeeApi } from '@/lib/api';
import { Plus, Globe, Phone, MessageSquare, Clock, AlignLeft, Send, FileSpreadsheet, Upload, CheckCircle, Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = { New: 'badge-blue', Contacted: 'badge-cyan', Consulting: 'badge-orange', Meeting: 'badge-purple', Signed: 'badge-green', Lost: 'badge-red' };
const STATUS_LABELS: Record<string, string> = {
  New: 'Khách mới',
  Contacted: 'Đã liên hệ',
  Consulting: 'Đang tư vấn',
  Meeting: 'Khách hẹn gặp',
  Signed: 'Ký Hợp đồng',
  Lost: 'Thất bại'
};
const KANBAN_COLS = ['New', 'Contacted', 'Consulting', 'Meeting', 'Signed', 'Lost'];

const formatAppointmentTime = (isoString?: string) => {
  if (!isoString) return '';
  try {
    // Đọc trực tiếp từ chuỗi để tránh lỗi múi giờ khi dùng Date object
    // Định dạng chuỗi: "YYYY-MM-DDTHH:mm" hoặc "YYYY-MM-DDTHH:mm:ss..."
    if (isoString.includes('T')) {
      const [dateStr, timeStr] = isoString.split('T');
      const [year, month, day] = dateStr.split('-');
      const timePart = timeStr.substring(0, 5); // Lấy HH:mm
      if (year && month && day && timePart) {
        return `${timePart} ${day}/${month}/${year}`;
      }
    }
    // Fallback dùng Date object nếu format khác
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
};


export default function CrmPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Tiềm năng' | 'Khách cũ'>('Tiềm năng');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add Lead form
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', facebookUrl: '', source: '', ownerId: '' });
  
  // Import Excel state
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  
  // Detail modal
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [actContent, setActContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null);
  
  const [assigningAI, setAssigningAI] = useState(false);

  const handleAssignToAI = async () => {
    if (!selectedLead) return;
    setAssigningAI(true);
    try {
      const res = await fetch('/api/ai/proactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: selectedLead })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert('AI đã phân tích hồ sơ và tiến hành tiếp cận khách hàng:\n\n' + data.message);
      viewLead(selectedLead.id); // Reload lead để thấy nhật ký
    } catch (err: any) {
      alert('Lỗi giao AI: ' + err.message);
    }
    setAssigningAI(false);
  };

  // Status Change Modals
  const [showSignedModal, setShowSignedModal] = useState<any>(null);
  const [showLostModal, setShowLostModal] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState<any>(null);
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [revenue, setRevenue] = useState<number | ''>('');
  const [contractFile, setContractFile] = useState<string>('');
  const [failureReason, setFailureReason] = useState<string>('Không đủ tài chính');

  useEffect(() => {
    employeeApi.getAll().then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Cho nhân viên được quyền xem tất cả giống Admin (theo yêu cầu)
      const ownerId = filterOwnerId || undefined;
      const res = await crmApi.getLeads({ ownerId });
      setLeads(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (user) fetchLeads(); }, [filterOwnerId, user?.id, user?.role]);

  const exportToExcel = () => {
    if (leads.length === 0) return alert('Không có dữ liệu để xuất!');
    const exportData = leads.map(l => ({
      'Tên khách hàng': l.name,
      'Số điện thoại': l.phone,
      'Nguồn': l.source || '',
      'Ghi chú': l.notes || '',
      'Trạng thái': STATUS_LABELS[l.status] || l.status,
      'Người phụ trách': l.ownerName || 'Chưa phân bổ',
      'Ngày tạo': new Date(l.createdAt).toLocaleDateString('vi-VN')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "KhachHang");
    XLSX.writeFile(wb, `DanhSachKhachHang_${new Date().getTime()}.xlsx`);
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, ownerId: form.ownerId || undefined };
      await crmApi.createLead(payload);
      setShowAdd(false); setForm({ name: '', phone: '', facebookUrl: '', source: '', ownerId: user?.id || '' }); fetchLeads();
    } catch (err: any) { alert(err.response?.data?.error || err.response?.data?.title || 'Lỗi tạo lead'); }
    setSaving(false);
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedLead) return; setSaving(true);
    try {
      // 1. Cập nhật các trường thông tin của Lead (status, checklists) trước
      await crmApi.updateLead(selectedLead.id, selectedLead);

      // 2. Nếu có nhập nội dung nhật ký, gửi tạo hoạt động mới
      if (actContent.trim()) {
        await crmApi.addActivity(selectedLead.id, { 
          content: actContent.trim(), 
          nextFollowUpDate: null,
          employeeName: user?.fullName || 'Hệ thống'
        });
        setActContent('');
      }

      // 3. Tải lại dữ liệu mới nhất
      const r = await crmApi.getLeadById(selectedLead.id);
      // Giữ lại appointmentTime từ state hiện tại nếu API cũ chưa trả về trường này
      const freshData = r.data;
      if (!freshData.appointmentTime && selectedLead.appointmentTime) {
        freshData.appointmentTime = selectedLead.appointmentTime;
      }
      setSelectedLead(freshData);
      fetchLeads();
      alert('Đã cập nhật trạng thái và gửi nhật ký thành công!');
    } catch (err: any) { 
      alert(err.response?.data?.error || err.message || 'Lỗi lưu thông tin'); 
    }
    setSaving(false);
  };


  const viewLead = async (id: string) => {
    setLoadingLeadId(id);
    try {
      const r = await crmApi.getLeadById(id);
      const leadData = r.data;
      if (!leadData) {
        alert('Khách hàng này không còn tồn tại (có thể đã bị xóa)!');
        setLoadingLeadId(null);
        fetchLeads();
        return;
      }
      // Fallback: Giữ appointmentTime từ danh sách hiện tại nếu API cũ chưa trả về
      if (!leadData.appointmentTime) {
        const existingLead = leads.find(l => l.id === id);
        if (existingLead?.appointmentTime) {
          leadData.appointmentTime = existingLead.appointmentTime;
        }
      }
      setSelectedLead(leadData);
    } catch (err: any) { 
      alert(err.response?.data?.error || err.message || 'Không tải được thông tin KH'); 
    }
    setLoadingLeadId(null);
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      let headerRowIndex = -1;
      let nameColIndex = -1;
      let phoneColIndex = -1;
      let notesColIndex = -1;

      // Tìm dòng header (quét 20 dòng đầu)
      for (let i = 0; i < Math.min(data.length, 20); i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        
        let tempNameIdx = -1;
        let tempPhoneIdx = -1;

        for (let j = 0; j < row.length; j++) {
          const rawStr = String(row[j] || '').trim();
          // Chuyển về chữ thường, xóa khoảng trắng thừa, và bỏ dấu tiếng Việt để so sánh chính xác tuyệt đối
          const asciiStr = rawStr.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
            .replace(/\s+/g, ' ');
          
          if (/^(ho ten|ho va ten|ten|ten khach hang|name|khach hang)$/.test(asciiStr) || asciiStr.includes('ten khach') || asciiStr.includes('ho ten')) {
            tempNameIdx = j;
          } else if (tempNameIdx === -1 && (asciiStr.includes('ten') || asciiStr.includes('name'))) {
            tempNameIdx = j;
          }

          if (/^(sdt|so dien thoai|dien thoai|phone|dt)$/.test(asciiStr) || asciiStr.includes('sdt') || asciiStr.includes('dien thoai')) {
            tempPhoneIdx = j;
          } else if (tempPhoneIdx === -1 && asciiStr.includes('phone')) {
            tempPhoneIdx = j;
          }

          if (/^(ghi chu|notes|note|ghi chú)$/.test(asciiStr) || asciiStr.includes('ghi chu')) {
            notesColIndex = j;
          }
        }

        if (tempNameIdx !== -1 && tempPhoneIdx !== -1) {
          headerRowIndex = i;
          nameColIndex = tempNameIdx;
          phoneColIndex = tempPhoneIdx;
          break;
        }
      }

      if (headerRowIndex === -1) {
        alert('Hệ thống không nhận diện được cột "Họ tên" và "Số điện thoại". Vui lòng đảm bảo file Excel có chứa 2 cột này ở phần tiêu đề!');
        return;
      }

      const parsedLeads = [];
      for (let i = headerRowIndex + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        
        const name = String(row[nameColIndex] || '').trim();
        const phoneRaw = String(row[phoneColIndex] || '').trim();
        const phone = phoneRaw.replace(/[^0-9+]/g, ''); 
        
        if (!name || phone.length < 8) continue;

        let notes = '';
        if (notesColIndex !== -1 && row[notesColIndex]) {
          notes = String(row[notesColIndex]).trim();
        }

        parsedLeads.push({
          name: name,
          phone: phone,
          source: 'Import Excel',
          notes: notes
        });
      }
      
      if (parsedLeads.length === 0) {
         alert('Tìm thấy tiêu đề nhưng không đọc được khách hàng nào (Tên bị trống hoặc SĐT không đúng định dạng).');
         return;
      }
      setImportData(parsedLeads);
    };
    reader.readAsBinaryString(file);
  };

  const handleImportSubmit = async () => {
    if (importData.length === 0) return alert('Không có dữ liệu hợp lệ!');
    if (selectedEmpIds.length === 0) return alert('Chưa chọn nhân viên nhận Khách hàng!');
    
    setImporting(true);
    try {
      await crmApi.importLeads({
        leads: importData,
        employeeIds: selectedEmpIds
      });
      alert('Nhập và chia Khách hàng thành công!');
      setShowImport(false);
      setImportData([]);
      setSelectedEmpIds([]);
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Lỗi khi import!');
    }
    setImporting(false);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('CẢNH BÁO NGUY HIỂM: Bạn có CHẮC CHẮN muốn xóa toàn bộ danh sách Khách hàng không? Hành động này không thể hoàn tác!')) return;
    try {
      await crmApi.deleteAllLeads();
      alert('Đã xóa toàn bộ Khách hàng!');
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Lỗi khi xóa!');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;
    try {
      await crmApi.deleteLead(id);
      setSelectedLead(null);
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Lỗi khi xóa khách hàng!');
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">CRM Quản lý Khách hàng</h1>
          <p className="page-subtitle">Theo dõi hành trình tư vấn du học</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select 
            className="form-input" 
            value={filterOwnerId} 
            onChange={e => setFilterOwnerId(e.target.value)}
            style={{ width: 160, padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
          >
            <option value="">Tất cả nhân viên</option>
            {employees.filter(e => e.role !== 'Admin').map(emp => (
              <option key={emp.id} value={emp.id}>{emp.fullName}</option>
            ))}
          </select>

          <button className="btn" style={{ background: '#3b82f6', color: 'white', border: 'none' }} onClick={exportToExcel}>
            <Download size={16} /> Xuất Excel
          </button>

          <button className="btn" style={{ background: '#10b981', color: 'white', border: 'none' }} onClick={() => {
            if (user?.role !== 'Admin') setSelectedEmpIds([user?.id || '']);
            setShowImport(true);
          }}>
            <FileSpreadsheet size={16} /> Nhập từ Excel
          </button>
          <button className="btn btn-primary" onClick={() => { setForm({ ...form, ownerId: user?.id || '' }); setShowAdd(true); }}><Plus size={16} /> Thêm khách hàng</button>

          <button className="btn" style={{ background: 'var(--accent-red)', color: 'white', border: 'none', marginLeft: 8 }} onClick={handleDeleteAll}>
            Xóa tất cả
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 4, width: 'fit-content' }}>
          {['Tiềm năng', 'Khách cũ'].map(tab => (
            <button 
              key={tab} 
              className={`btn ${activeTab === tab ? 'btn-primary' : ''}`} 
              style={{ background: activeTab !== tab ? 'transparent' : undefined, border: 'none' }} 
              onClick={() => setActiveTab(tab as 'Tiềm năng' | 'Khách cũ')}
            >
              {tab === 'Tiềm năng' ? 'Khách hàng Tiềm năng' : 'Danh sách Khách cũ'}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative', width: 280 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-input" 
            placeholder="Tìm theo tên, SĐT..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 36, width: '100%', borderRadius: 20, background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
      ) : (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {(activeTab === 'Tiềm năng' ? ['New', 'Contacted', 'Consulting', 'Meeting'] : ['Signed', 'Lost']).map(col => {
            const colLeads = leads.filter(l => l.status === col && (!searchQuery || (l.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || (l.phone || '').includes(searchQuery)));
            return (
              <div key={col} className="kanban-col">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{STATUS_LABELS[col]}</h3>
                  <span style={{ fontSize: 12, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-secondary)' }}>{colLeads.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {colLeads.map(lead => {
                    const isCardLoading = loadingLeadId === lead.id;
                    const ownerName = lead.ownerName || employees.find(e => e.id === lead.ownerId)?.fullName || 'Trống';
                    return (
                      <div 
                        key={lead.id} 
                        className="kanban-card" 
                        onClick={() => !loadingLeadId && viewLead(lead.id)}
                        style={{ position: 'relative', opacity: isCardLoading ? 0.7 : 1, cursor: loadingLeadId ? 'wait' : 'pointer' }}
                      >
                        {isCardLoading && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                            <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                          </div>
                        )}
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{lead.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <Phone size={12} /> {lead.phone}
                        {lead.facebookUrl && <a href={lead.facebookUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-blue)', marginLeft: 4 }}><Globe size={14} /></a>}
                      </div>
                      {lead.appointmentTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent-purple)', fontWeight: 600, marginBottom: 8 }}>
                          <span>📅 Hẹn: {formatAppointmentTime(lead.appointmentTime)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-muted)' }}>{lead.source || 'Tự nhiên'}</span>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }} title={ownerName}>
                          {ownerName.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Thêm khách hàng mới</h2>
            <form onSubmit={handleAddLead}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Tên khách hàng *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div><label className="form-label">Số điện thoại *</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required /></div>
                </div>
                <div><label className="form-label">Link Facebook</label><input className="form-input" placeholder="https://fb.com/..." value={form.facebookUrl} onChange={e => setForm({...form, facebookUrl: e.target.value})} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label className="form-label">Nguồn khách</label><input className="form-input" placeholder="Facebook, Google, Giới thiệu..." value={form.source} onChange={e => setForm({...form, source: e.target.value})} /></div>
                  {user?.role !== 'Employee' && (
                  <div>
                    <label className="form-label">Người phụ trách</label>
                    <select className="form-input" value={form.ownerId} onChange={e => setForm({...form, ownerId: e.target.value})}>
                      <option value="">-- Chọn nhân viên --</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                    </select>
                  </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Thêm Khách hàng'}</button>
            </div>
          </form>
        </div>
      </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => !importing && setShowImport(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nhập Khách hàng từ Excel & Chia Lead</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>1. Tải lên file Excel</h3>
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, border: '2px dashed var(--border)', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-hover)', marginBottom: 16 }}>
                  <Upload size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: '0 16px' }}>
                    Kéo thả hoặc click để chọn file .xlsx<br/>
                    <small>(Hệ thống tự nhận diện cột thông minh. Cột bắt buộc phải có: "Tên khách hàng" hoặc "Họ và tên", và "Số điện thoại")</small>
                  </span>
                  <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>

                {importData.length > 0 && (
                  <div style={{ padding: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8, fontSize: 13, color: 'var(--accent-green)', fontWeight: 500 }}>
                    <CheckCircle size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                    Đọc thành công {importData.length} khách hàng hợp lệ!
                  </div>
                )}
              </div>

              {user?.role === 'Admin' && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>2. Chọn Nhân viên nhận Khách (Chia đều)</h3>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-secondary)', height: 200, overflowY: 'auto' }}>
                    {employees.filter(e => e.role !== 'Admin').map(emp => (
                      <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedEmpIds.includes(emp.id)} 
                          onChange={(e) => {
                            if (e.target.checked) setSelectedEmpIds([...selectedEmpIds, emp.id]);
                            else setSelectedEmpIds(selectedEmpIds.filter(id => id !== emp.id));
                          }} 
                          style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
                        />
                        <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{emp.fullName}</span>
                      </label>
                    ))}
                    {employees.filter(e => e.role !== 'Admin').length === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Không có nhân viên nào.</div>}
                  </div>
                </div>
              )}
            </div>

            {importData.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Bản xem trước (Tối đa 5 khách hàng)</h3>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Họ tên</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Số điện thoại</th>
                        <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 5).map((l, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px' }}>{l.name}</td>
                          <td style={{ padding: '8px 12px' }}>{l.phone}</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{l.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 30, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowImport(false)} disabled={importing}>Hủy</button>
              <button className="btn btn-primary" onClick={handleImportSubmit} disabled={importing || importData.length === 0 || selectedEmpIds.length === 0} style={{ padding: '10px 24px' }}>
                {importing ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (user?.role === 'Admin' ? 'Xác nhận & Chia Khách' : 'Xác nhận & Thêm Khách')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={() => { setSelectedLead(null); setIsEditingLead(false); }}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                {isEditingLead ? (
                  <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input type="text" className="form-input" style={{ fontSize: 18, fontWeight: 700 }} value={selectedLead.name} onChange={e => setSelectedLead({...selectedLead, name: e.target.value})} placeholder="Họ và tên" />
                    <input type="text" className="form-input" style={{ fontSize: 13 }} value={selectedLead.phone} onChange={e => setSelectedLead({...selectedLead, phone: e.target.value})} placeholder="Số điện thoại" />
                  </div>
                ) : (
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>{selectedLead.name}</h2>
                    <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {selectedLead.phone}</span>
                      {selectedLead.facebookUrl && <a href={selectedLead.facebookUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 6 }}><Globe size={14} /> Facebook</a>}
                      <span style={{ background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: 4 }}>Nguồn: {selectedLead.source || 'Tự nhiên'}</span>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="form-input" style={{ width: 140, fontWeight: 600, color: `var(--accent-${selectedLead.status === 'Signed' ? 'green' : selectedLead.status === 'Lost' ? 'red' : 'blue'})` }} value={selectedLead.status} onChange={e => {
                    const newStatus = e.target.value;
                    if (newStatus === 'Signed') {
                      setShowSignedModal(selectedLead);
                    } else if (newStatus === 'Lost') {
                      setShowLostModal(selectedLead);
                    } else if (newStatus === 'Meeting') {
                      setAppointmentTime(selectedLead.appointmentTime || '');
                      setShowMeetingModal(selectedLead);
                    } else {
                      const nowStr = new Date().toISOString();
                      const updated = { ...selectedLead, status: newStatus };
                      if (newStatus === 'New') {
                        updated.contactedAt = null;
                        updated.consultingAt = null;
                        updated.meetingAt = null;
                        updated.signedAt = null;
                      } else if (newStatus === 'Contacted') {
                        if (!updated.contactedAt) updated.contactedAt = nowStr;
                        updated.consultingAt = null;
                        updated.meetingAt = null;
                        updated.signedAt = null;
                      } else if (newStatus === 'Consulting') {
                        if (!updated.contactedAt) updated.contactedAt = nowStr;
                        if (!updated.consultingAt) updated.consultingAt = nowStr;
                        updated.meetingAt = null;
                        updated.signedAt = null;
                      } else if (newStatus === 'Meeting') {
                        if (!updated.contactedAt) updated.contactedAt = nowStr;
                        if (!updated.consultingAt) updated.consultingAt = nowStr;
                        if (!updated.meetingAt) updated.meetingAt = nowStr;
                        updated.signedAt = null;
                      }
                      setSelectedLead(updated);
                    }
                  }}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>

                  {isEditingLead ? (
                    <button className="btn btn-primary" style={{ padding: '0 12px' }} disabled={saving} onClick={async () => {
                      setSaving(true);
                      try {
                        await crmApi.updateLead(selectedLead.id, selectedLead);
                        setIsEditingLead(false);
                        fetchLeads();
                      } catch (e) { alert('Lỗi lưu'); }
                      setSaving(false);
                    }}>
                      {saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  ) : (
                    <button className="btn btn-secondary" style={{ padding: '0 12px' }} onClick={() => setIsEditingLead(true)}>Sửa</button>
                  )}
                  
                  <button className="btn" style={{ background: 'var(--accent-red)', color: 'white', border: 'none', padding: '0 12px' }} onClick={() => handleDeleteLead(selectedLead.id)}>
                    Xóa
                  </button>
                </div>
              </div>
              
              {isEditingLead ? (
                <div style={{ marginTop: 16, marginBottom: 16, padding: '0 24px' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Ghi chú:</label>
                  <textarea className="form-input" style={{ width: '100%', fontSize: 13 }} rows={3} value={selectedLead.notes || ''} onChange={e => setSelectedLead({...selectedLead, notes: e.target.value})} />
                </div>
              ) : selectedLead.notes && (
                <div style={{ marginTop: 16, marginBottom: 16, padding: 12, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                  <strong>Ghi chú (Từ Excel):</strong> {selectedLead.notes}
                </div>
              )}

              {selectedLead.appointmentTime && (
                <div style={{ marginTop: 12, marginBottom: 12, padding: 12, background: 'rgba(147, 51, 234, 0.1)', border: '1px solid rgba(147, 51, 234, 0.2)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>📅 Lịch hẹn gặp:</strong> <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{formatAppointmentTime(selectedLead.appointmentTime)}</span>
                  </span>
                  <button 
                    className="btn" 
                    type="button"
                    style={{ background: 'var(--accent-purple)', color: 'white', border: 'none', padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }} 
                    onClick={() => {
                      setAppointmentTime(selectedLead.appointmentTime || '');
                      setShowMeetingModal(selectedLead);
                    }}
                  >
                    Đổi lịch hẹn
                  </button>
                </div>
              )}

              {selectedLead.status === 'Meeting' && !selectedLead.appointmentTime && (
                <div style={{ marginTop: 12, marginBottom: 12, padding: 12, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, fontSize: 13, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>⚠️ Chưa đặt ngày giờ hẹn gặp!</span>
                  <button 
                    className="btn" 
                    type="button"
                    style={{ background: 'var(--accent-blue)', color: 'white', border: 'none', padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }} 
                    onClick={() => {
                      setAppointmentTime('');
                      setShowMeetingModal(selectedLead);
                    }}
                  >
                    Đặt lịch ngay
                  </button>
                </div>
              )}
              
              {/* Funnel Checklist */}
              <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Tiến trình Phễu (Tự động tính KPI)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'newAt', label: '1. Tiếp cận mới' },
                    { key: 'contactedAt', label: '2. Đã kết nối thành công' },
                    { key: 'consultingAt', label: '3. Tiềm năng cao (Đang tư vấn)' },
                    { key: 'meetingAt', label: '4. Hẹn gặp / Lên văn phòng' },
                    { key: 'signedAt', label: '5. Đã ký hợp đồng / Chốt cọc' },
                  ].map(step => {
                    const isChecked = !!selectedLead[step.key];
                    return (
                      <label key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                        <input type="checkbox" checked={isChecked} onChange={(e) => {
                          const isCheckedNow = e.target.checked;
                          const val = isCheckedNow ? new Date().toISOString() : null;
                          let newStatus = selectedLead.status;
                          
                          // Determine corresponding status
                          if (step.key === 'newAt') {
                            if (!isCheckedNow) return; // cannot uncheck "New"
                          } else if (step.key === 'contactedAt') {
                            newStatus = isCheckedNow ? 'Contacted' : 'New';
                          } else if (step.key === 'consultingAt') {
                            newStatus = isCheckedNow ? 'Consulting' : 'Contacted';
                          } else if (step.key === 'meetingAt') {
                            newStatus = isCheckedNow ? 'Meeting' : 'Consulting';
                          } else if (step.key === 'signedAt') {
                            newStatus = isCheckedNow ? 'Signed' : 'Meeting';
                          }

                          if (step.key === 'meetingAt' && isCheckedNow) {
                            setAppointmentTime(selectedLead.appointmentTime || '');
                            setShowMeetingModal(selectedLead);
                            return;
                          }

                          if (step.key === 'signedAt' && isCheckedNow) {
                            const updated = { ...selectedLead, [step.key]: val, status: 'Signed' };
                            setSelectedLead(updated);
                            setShowSignedModal(updated);
                            return;
                          }

                          const updated = { ...selectedLead, [step.key]: val, status: newStatus };
                          
                          // If checking a higher stage, make sure lower stages are also checked
                          if (isCheckedNow) {
                            const nowStr = new Date().toISOString();
                            if (step.key === 'signedAt') {
                              if (!updated.newAt) updated.newAt = nowStr;
                              if (!updated.contactedAt) updated.contactedAt = nowStr;
                              if (!updated.consultingAt) updated.consultingAt = nowStr;
                              if (!updated.meetingAt) updated.meetingAt = nowStr;
                            } else if (step.key === 'meetingAt') {
                              if (!updated.newAt) updated.newAt = nowStr;
                              if (!updated.contactedAt) updated.contactedAt = nowStr;
                              if (!updated.consultingAt) updated.consultingAt = nowStr;
                            } else if (step.key === 'consultingAt') {
                              if (!updated.newAt) updated.newAt = nowStr;
                              if (!updated.contactedAt) updated.contactedAt = nowStr;
                            } else if (step.key === 'contactedAt') {
                              if (!updated.newAt) updated.newAt = nowStr;
                            }
                          } else {
                            // If unchecking a lower stage, clear all higher stages as well
                            if (step.key === 'contactedAt') {
                              updated.consultingAt = null;
                              updated.meetingAt = null;
                              updated.signedAt = null;
                            } else if (step.key === 'consultingAt') {
                              updated.meetingAt = null;
                              updated.signedAt = null;
                            } else if (step.key === 'meetingAt') {
                              updated.signedAt = null;
                            }
                          }
                          setSelectedLead(updated);
                        }} style={{ width: 16, height: 16 }} />
                        <span style={{ fontWeight: isChecked ? 600 : 400, color: isChecked ? 'var(--accent-blue)' : 'var(--text-primary)' }}>{step.label}</span>
                        {isChecked && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>- {new Date(selectedLead[step.key]).toLocaleDateString('vi-VN')}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginTop: 24, padding: 24, overflowY: 'auto', flex: 1, borderTop: '1px solid var(--border)' }}>
              
              {/* Left Column: Stage History / Audit Trail */}
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-purple)' }}><Clock size={16} /> Audit Trail: Lịch sử Chuyển đổi</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 11, top: 10, bottom: 10, width: 2, background: 'var(--border)', zIndex: 0 }} />
                  
                  {/* Mock Data for UI Demonstration of Stage History */}
                  {[
                    { stage: 'Tiềm năng cao', user: selectedLead.ownerName || 'Hệ thống', time: selectedLead.consultingAt || new Date().toISOString() },
                    { stage: 'Đã kết nối', user: selectedLead.ownerName || 'Hệ thống', time: selectedLead.contactedAt || new Date(Date.now() - 86400000).toISOString() },
                    { stage: 'Tiếp cận mới', user: 'Hệ thống', time: selectedLead.newAt || new Date(Date.now() - 172800000).toISOString() },
                  ].filter(h => h.time).map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1, paddingBottom: 24 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-card)', border: `2px solid var(--accent-purple)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-purple)' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Chuyển sang: {h.stage}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Bởi: {h.user} • {new Date(h.time).toLocaleString('vi-VN')}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 40 }}>
                    *Đây là bản xem trước của hệ thống lưu vết Database. Cần tích hợp C# Backend để lưu log thực tế.
                  </div>
                </div>
              </div>

              {/* Right Column: Activity Logs */}
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><AlignLeft size={16} /> Nhật ký tư vấn</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  {selectedLead.activityLogs?.map((log: any) => (
                  <div key={log.id} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, borderLeft: '3px solid var(--accent-blue)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{log.employeeName}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}><Clock size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{log.content}</div>
                  </div>
                ))}
                {(!selectedLead.activityLogs || selectedLead.activityLogs.length === 0) && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có nhật ký nào.</p>
                )}
              </div>

                <form onSubmit={handleAddActivity} style={{ background: 'var(--bg-hover)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <textarea className="form-input" rows={3} placeholder="Ghi chú nội dung trao đổi với khách hàng (Không bắt buộc)..." value={actContent} onChange={e => setActContent(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><Send size={14} /> Gửi nhật ký</>}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Scheduler Modal */}
      {showMeetingModal && (
        <div className="modal-overlay" onClick={() => setShowMeetingModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: 'var(--accent-blue)' }}>Đặt lịch hẹn gặp khách hàng 📅</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="form-label">📆 Chọn Ngày hẹn *</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={appointmentTime ? appointmentTime.split('T')[0] : ''}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => {
                      const dateStr = e.target.value;
                      const timeStr = appointmentTime ? (appointmentTime.split('T')[1] || '09:00') : '09:00';
                      setAppointmentTime(dateStr ? `${dateStr}T${timeStr}` : '');
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">🕐 Chọn Giờ hẹn (24h) *</label>
                  <input 
                    type="time"
                    className="form-input"
                    value={appointmentTime ? (appointmentTime.split('T')[1] || '') : ''}
                    onChange={e => {
                      const timeStr = e.target.value;
                      const dateStr = appointmentTime ? (appointmentTime.split('T')[0] || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];
                      setAppointmentTime(dateStr ? `${dateStr}T${timeStr}` : '');
                    }}
                    required
                  />
                </div>
              </div>
              {appointmentTime && appointmentTime.includes('T') && appointmentTime.split('T')[0] && appointmentTime.split('T')[1] && (
                <div style={{ padding: '10px 14px', background: 'rgba(147, 51, 234, 0.08)', border: '1px solid rgba(147, 51, 234, 0.2)', borderRadius: 8, fontSize: 13, color: 'var(--accent-purple)', fontWeight: 600 }}>
                  📅 Xác nhận: {(() => {
                    const [dateStr, timeStr] = appointmentTime.split('T');
                    const [y, m, d] = dateStr.split('-');
                    return `${timeStr} ngày ${d}/${m}/${y}`;
                  })()}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowMeetingModal(null)}>Hủy</button>
              <button 
                className="btn btn-primary" 
                disabled={!appointmentTime || !appointmentTime.includes('T') || !appointmentTime.split('T')[0] || !appointmentTime.split('T')[1]}
                onClick={() => { 
                  const nowStr = new Date().toISOString();
                  const updated = { 
                    ...showMeetingModal, 
                    status: 'Meeting', 
                    appointmentTime,
                    meetingAt: nowStr
                  };
                  if (!updated.newAt) updated.newAt = nowStr;
                  if (!updated.contactedAt) updated.contactedAt = nowStr;
                  if (!updated.consultingAt) updated.consultingAt = nowStr;
                  
                  // Save changes to detail view if open
                  if (selectedLead && selectedLead.id === showMeetingModal.id) {
                    setSelectedLead(updated);
                  }
                  
                  // Optimistic updates
                  setLeads(prev => prev.map(l => l.id === showMeetingModal.id ? updated : l));
                  
                  // Save to database
                  crmApi.updateLead(showMeetingModal.id, updated)
                    .then(() => {
                      fetchLeads();
                    })
                    .catch(() => alert('Lỗi lưu lịch hẹn'));
                    
                  setShowMeetingModal(null); 
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signed Modal */}
      {showSignedModal && (
        <div className="modal-overlay" onClick={() => setShowSignedModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: 'var(--accent-green)' }}>Chúc mừng! Chốt khách thành công 🎉</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Doanh thu thu về (VNĐ) *</label>
                <input type="number" className="form-input" value={revenue} onChange={e => setRevenue(Number(e.target.value))} placeholder="Ví dụ: 15000000" />
              </div>
              <div>
                <label className="form-label">Link File Hợp đồng</label>
                <input type="text" className="form-input" value={contractFile} onChange={e => setContractFile(e.target.value)} placeholder="https://drive.google.com/..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowSignedModal(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => { setSelectedLead({ ...selectedLead, status: 'Signed', revenue: revenue ? Number(revenue) : 0, contractFile, signedAt: new Date().toISOString() }); setShowSignedModal(null); }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Modal */}
      {showLostModal && (
        <div className="modal-overlay" onClick={() => setShowLostModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20, color: 'var(--accent-red)' }}>Khách hàng từ chối</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label">Lý do thất bại</label>
                <select className="form-input" value={failureReason} onChange={e => setFailureReason(e.target.value)}>
                  <option value="Không đủ tài chính">Không đủ tài chính</option>
                  <option value="Không có nhu cầu">Không có nhu cầu</option>
                  <option value="Chọn trung tâm khác">Chọn trung tâm khác</option>
                  <option value="Không nghe máy">Không nghe máy</option>
                  <option value="Sai số điện thoại">Sai số điện thoại</option>
                  <option value="Chưa quyết định">Chưa quyết định</option>
                  <option value="Khác">Lý do khác...</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowLostModal(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={() => { setSelectedLead({ ...selectedLead, status: 'Lost', failureReason }); setShowLostModal(null); }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
