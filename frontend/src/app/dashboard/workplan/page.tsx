'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { workPlanApi, employeeApi, crmApi } from '@/lib/api';
import { Plus, Save, Trash2, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { getISOWeek, getYear, setISOWeek as dateFnsSetISOWeek, setYear as dateFnsSetYear, startOfWeek, endOfWeek, format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Employee { id: string; fullName: string; role?: string; }
interface WorkPlanItem { id?: string; taskName: string; actionPlan: string; supporterId: string | null; deadline: string; kpi: string; status: string; notes: string; }
interface WeeklyWorkPlan { 
  id?: string; weekNumber: number; year: number; employeeId: string; weekTarget: string; notes: string; items: WorkPlanItem[]; 
  targetNew?: number; targetContacted?: number; targetConsulting?: number; targetMeeting?: number; targetSigned?: number;
  actualNew?: number; actualContacted?: number; actualConsulting?: number; actualMeeting?: number; actualSigned?: number;
  evalNew?: string; evalContacted?: string; evalConsulting?: string; evalMeeting?: string; evalSigned?: string;
  failureReasonAnalysis?: string;
  adminFeedback?: string;
}

const STATUS_COLORS: Record<string, string> = { Pending: 'badge-gray', InProgress: 'badge-blue', Completed: 'badge-green', Cancelled: 'badge-red' };
const STATUS_LABELS: Record<string, string> = { Pending: 'Chưa làm', InProgress: 'Đang làm', Completed: 'Hoàn thành', Cancelled: 'Hủy bỏ' };

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function WorkPlanPage() {
  const { user } = useAuth();
  const [week, setWeek] = useState(getISOWeek(new Date()));
  const [year, setYear] = useState(getYear(new Date()));
  const [plan, setPlan] = useState<WeeklyWorkPlan | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  const getDateRangeStr = () => {
    try {
      const baseDate = dateFnsSetISOWeek(dateFnsSetYear(new Date(), year), week);
      const start = startOfWeek(baseDate, { weekStartsOn: 1 });
      const end = endOfWeek(baseDate, { weekStartsOn: 1 });
      return `(${format(start, 'dd/MM', { locale: vi })} - ${format(end, 'dd/MM', { locale: vi })})`;
    } catch { return ''; }
  };
  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';
  const isViewingOthers = !!(isManagerOrAdmin && selectedEmployeeId && selectedEmployeeId !== user?.id);

  useEffect(() => {
    employeeApi.getAll().then(res => setEmployees(res.data)).catch(() => {});
  }, []);

  const fetchPlan = async () => {
    setLoading(true); setPlan(null); setAllPlans([]);
    try {
      let p: any = null;
      if (isManagerOrAdmin) {
        const res = await workPlanApi.getPlans(week, year);
        setAllPlans(res.data);
        if (selectedEmployeeId) {
          p = res.data.find((x: any) => x.employeeId === selectedEmployeeId);
          if (!p) p = { weekNumber: week, year, employeeId: selectedEmployeeId, weekTarget: '', notes: '', items: [] };
        }
      } else {
        const res = await workPlanApi.getMyPlan(week, year);
        if (res.data) p = res.data;
        else p = { weekNumber: week, year, employeeId: user?.id || '', weekTarget: '', notes: '', items: [] };
      }

      if (p) {
        setPlan(p);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPlan(); }, [week, year, selectedEmployeeId, isManagerOrAdmin]);

  const handleSave = async () => {
    if (!plan || isViewingOthers) return;
    setSaving(true);
    try {
      const planToSave = {
        ...plan,
        targetNew: plan.actualNew || 0
      };
      await workPlanApi.savePlan(planToSave);
      alert('Đã lưu kế hoạch thành công!');
      fetchPlan();
    } catch (err: unknown) { alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi lưu kế hoạch'); }
    setSaving(false);
  };

  const submitFeedback = async () => {
    if (!plan || !plan.id || !feedbackText.trim()) return;
    setSubmittingFeedback(true);
    try {
      await workPlanApi.addFeedback(plan.id, feedbackText);
      alert('Đã gửi nhận xét thành công!');
      fetchPlan();
      setFeedbackText('');
    } catch {
      alert('Lỗi gửi nhận xét');
    }
    setSubmittingFeedback(false);
  };

  const addItem = () => {
    if (!plan) return;
    setPlan({ ...plan, items: [...(plan.items || []), { taskName: '', actionPlan: '', supporterId: null, deadline: getLocalDateString(), kpi: '', status: 'Pending', notes: '' }] });
  };

  const updateItem = (index: number, field: keyof WorkPlanItem, value: any) => {
    if (!plan) return;
    const newItems = [...(plan.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setPlan({ ...plan, items: newItems });
  };

  const removeItem = async (index: number, itemId?: string) => {
    if (!plan) return;
    if (itemId && !confirm('Xóa công việc này khỏi CSDL?')) return;
    if (itemId) {
      try { await workPlanApi.deleteItem(plan.id as string, itemId); } catch { alert('Lỗi xóa'); return; }
    }
    const newItems = [...(plan.items || [])];
    newItems.splice(index, 1);
    setPlan({ ...plan, items: newItems });
  };
  const autoGenerateComments = () => {
    if (!plan) return;
    const newPlan = { ...plan };
    const rows = [
      { t: 'targetNew', a: 'actualNew', e: 'evalNew', label: 'Tiếp cận mới' },
      { t: 'targetContacted', a: 'actualContacted', e: 'evalContacted', label: 'Kết nối thành công' },
      { t: 'targetConsulting', a: 'actualConsulting', e: 'evalConsulting', label: 'Tiềm năng cao' },
      { t: 'targetMeeting', a: 'actualMeeting', e: 'evalMeeting', label: 'Hẹn gặp' },
      { t: 'targetSigned', a: 'actualSigned', e: 'evalSigned', label: 'Chốt Hợp đồng' },
    ];
    
    rows.forEach(r => {
      const target = Number((newPlan as any)[r.t] || 0);
      const actual = Number((newPlan as any)[r.a] || 0);
      if (target === 0) {
        if (actual > 0) {
          (newPlan as any)[r.e] = `🟢 XUẤT SẮC: Đã có kết quả (${actual}) dù không đặt chỉ tiêu đầu tuần. Cần duy trì phong độ và phát huy!`;
        } else {
          (newPlan as any)[r.e] = 'Chưa đặt chỉ tiêu.';
        }
      } else {
        const pct = (actual / target) * 100;
        if (pct >= 80) {
          (newPlan as any)[r.e] = `🟢 ĐẠT / TỐT: Làm rất tốt! Tỷ lệ đạt ${pct.toFixed(1)}%. Tiếp tục duy trì phong độ và đẩy mạnh khai thác sâu tệp khách hàng này để chốt sale.`;
        } else if (pct >= 70) {
          (newPlan as any)[r.e] = `🟡 ĐẠT NHƯNG CHƯA ỔN ĐỊNH: Tương đối tốt (đạt ${pct.toFixed(1)}%). Đã bám sát mục tiêu nhưng cần nỗ lực ép số thêm một chút để hoàn thành 100% KPI. Chú ý theo dõi sát các khách hàng ở khâu này.`;
        } else if (pct >= 60) {
          (newPlan as any)[r.e] = `🟠 KHÔNG ĐẠT KỲ VỌNG: Hiệu suất đang dưới mức kỳ vọng (đạt ${pct.toFixed(1)}%). Khâu này đang bị chững lại và có dấu hiệu rớt khách. Cần tập trung cải thiện kỹ năng xử lý từ chối và nhờ Quản lý kèm cặp thêm.`;
        } else {
          (newPlan as any)[r.e] = `🔴 KHÔNG ĐẠT - BÁO ĐỘNG: Hiệu suất khâu này quá thấp (chỉ đạt ${pct.toFixed(1)}%). Yêu cầu rà soát lại ngay tệp data hoặc kịch bản gọi điện. Cần lên lịch trao đổi trực tiếp với Quản lý để tìm nguyên nhân và có kế hoạch khắc phục (PIP) cho tuần tới.`;
        }
      }
    });

    setPlan(newPlan);
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Kế hoạch Công việc Tuần</h1>
          <p className="page-subtitle">Quản lý mục tiêu và đầu việc</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeek(w => w > 1 ? w - 1 : 52)}><ChevronLeft size={16} /></button>
            <div style={{ fontWeight: 600, fontSize: 16, textAlign: 'center', lineHeight: '1.2' }}>
              Tuần {week} / {year}
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>{getDateRangeStr()}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeek(w => w < 52 ? w + 1 : 1)}><ChevronRight size={16} /></button>
          </div>
          
          {isManagerOrAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Nhân viên:</span>
              <select className="form-input" style={{ width: 240 }} value={selectedEmployeeId} onChange={e => setSelectedEmployeeId(e.target.value)}>
                {user?.role !== 'Admin' && <option value="">-- Kế hoạch của tôi --</option>}
                {user?.role === 'Admin' && <option value="">-- Chọn nhân viên --</option>}
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
              </select>
            </div>
          )}

        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
      ) : isManagerOrAdmin && !selectedEmployeeId ? (
        <div className="glass-card" style={{ padding: 20, marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Báo cáo Tổng hợp KPI Phễu của Nhân viên</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ background: '#1e3a8a', color: 'white', fontSize: 13 }}>
                  <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Nhân viên</th>
                  <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Tiếp cận mới</th>
                  <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Kết nối</th>
                  <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Tiềm năng</th>
                  <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Hẹn gặp</th>
                  <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Chốt Hợp đồng</th>
                  <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: 14 }}>
                {employees.map((emp, i) => {
                  if (emp.role === 'Admin') return null;
                  const p = allPlans.find(x => x.employeeId === emp.id);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px', border: '1px solid var(--border)', fontWeight: 600, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>
                          {emp.fullName.charAt(0)}
                        </div>
                        {emp.fullName}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{p?.actualNew || 0}</span> / <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p?.targetNew || 0}</span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{p?.actualContacted || 0}</span> / <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p?.targetContacted || 0}</span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{p?.actualConsulting || 0}</span> / <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p?.targetConsulting || 0}</span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{p?.actualMeeting || 0}</span> / <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p?.targetMeeting || 0}</span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{p?.actualSigned || 0}</span> / <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{p?.targetSigned || 0}</span>
                      </td>
                      <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEmployeeId(emp.id)}>Xem chi tiết</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : plan ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>


            <div className="glass-card" style={{ padding: 20, marginTop: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              I. Báo cáo chỉ số phễu khách hàng (Quan trọng)
              {!isViewingOthers && (
                <button type="button" className="btn btn-secondary" onClick={autoGenerateComments} style={{ padding: '6px 12px', fontSize: 13, background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(6, 182, 212, 0.1))', border: '1px solid rgba(168, 85, 247, 0.3)', color: 'var(--accent-purple)' }}>✨ Tự động nhận xét (AI)</button>
              )}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#1e3a8a', color: 'white', fontSize: 13 }}>
                    <th style={{ padding: '12px', border: '1px solid var(--border)', textAlign: 'left', width: '25%' }}>Mức độ trong Phễu Tuyển sinh</th>
                    <th style={{ padding: '12px', border: '1px solid var(--border)', width: '15%' }}>Chỉ tiêu đặt ra (KPI Tuần)</th>
                    <th style={{ padding: '12px', border: '1px solid var(--border)', width: '15%' }}>Kết quả thực tế đạt</th>
                    <th style={{ padding: '12px', border: '1px solid var(--border)', width: '15%' }}>Tỷ lệ đạt (%)</th>
                    <th style={{ padding: '12px', border: '1px solid var(--border)' }}>Đánh giá hiệu suất khâu này</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: 14 }}>
                  {[
                    { label: '1. TỔNG DATA TIẾP CẬN MỚI (Số người biết tới/nhận tin)', t: 'targetNew', a: 'actualNew', e: 'evalNew' },
                    { label: '2. DATA KẾT NỐI THÀNH CÔNG (Số người nghe máy/rep tin nhắn)', t: 'targetContacted', a: 'actualContacted', e: 'evalContacted' },
                    { label: '3. KHÁCH HÀNG TIỀM NĂNG CAO (Quan tâm sâu chi phí, lịch học)', t: 'targetConsulting', a: 'actualConsulting', e: 'evalConsulting' },
                    { label: '4. KHÁCH HẸN GẶP / LÊN VĂN PHÒNG (Gặp trực tiếp/gọi video sau)', t: 'targetMeeting', a: 'actualMeeting', e: 'evalMeeting' },
                    { label: '5. HỢP ĐỒNG ĐÃ KÝ KẾT / DOANH THU THỰC TẾ (Chốt cọc thành công)', t: 'targetSigned', a: 'actualSigned', e: 'evalSigned' },
                  ].map((row, i) => {
                    const actual = (plan as any)[row.a] || 0;
                    const target = row.t === 'targetNew' ? actual : ((plan as any)[row.t] || 0);
                    const percent = target > 0 ? ((actual / target) * 100).toFixed(1) : '0.0';
                    const isInputDisabled = isViewingOthers || row.t === 'targetNew';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px', border: '1px solid var(--border)', textAlign: 'left', fontWeight: 600 }}>{row.label}</td>
                        <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                          <input type="number" className="form-input" style={{ textAlign: 'center', background: isInputDisabled ? 'transparent' : '', border: isInputDisabled ? 'none' : '' }} value={target} onChange={e => setPlan({ ...plan, [row.t]: parseInt(e.target.value) || 0 })} disabled={isInputDisabled} min={0} />
                        </td>
                        <td style={{ padding: '12px', border: '1px solid var(--border)', fontWeight: 700, color: 'var(--accent-blue)', fontSize: 16 }}>
                          {actual}
                        </td>
                        <td style={{ padding: '12px', border: '1px solid var(--border)', fontWeight: 600, color: Number(percent) >= 100 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                          {percent}%
                        </td>
                        <td style={{ padding: '12px', border: '1px solid var(--border)' }}>
                          <textarea className="form-input" rows={2} style={{ width: '100%', resize: 'vertical', background: isViewingOthers ? 'transparent' : 'var(--bg-secondary)', border: isViewingOthers ? 'none' : '', color: 'var(--text-primary)', opacity: 1, fontWeight: 500 }} value={(plan as any)[row.e] || ''} onChange={e => setPlan({ ...plan, [row.e]: e.target.value })} disabled={true} placeholder="Nhấn nút ✨ Tự động nhận xét (AI) ở trên..." />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 16, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              II. Phân tích thực tế & Kế hoạch hành động sửa sai (Bắt buộc)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '30% 70%', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ background: '#3b82f6', color: 'white', padding: 12, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                1. Lý do không đạt chỉ tiêu (Nếu có gãy khâu nào):
              </div>
              <div>
                <textarea className="form-input" rows={4} style={{ width: '100%', resize: 'vertical', border: 'none', borderRadius: 0, background: isViewingOthers ? 'transparent' : '' }} value={plan.failureReasonAnalysis || ''} onChange={e => setPlan({ ...plan, failureReasonAnalysis: e.target.value })} disabled={isViewingOthers} placeholder="Nhập chi tiết phân tích của bạn (không viết chung chung)..." />
              </div>
            </div>

            {(isViewingOthers || plan.adminFeedback) && (
              <>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 32, marginBottom: 16, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  III. Nhận xét của Quản lý / Admin
                </h3>
                {plan.adminFeedback && (
                  <div style={{ padding: 16, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 8, fontSize: 15, whiteSpace: 'pre-wrap', marginBottom: 16, color: 'var(--text-primary)' }}>
                    {plan.adminFeedback}
                  </div>
                )}
                
                {isManagerOrAdmin && isViewingOthers && (
                  <div style={{ marginTop: 16, padding: 20, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 12 }}>{plan.adminFeedback ? 'Cập nhật nhận xét' : 'Thêm nhận xét / Đánh giá'}</div>
                    <textarea 
                      className="form-input" 
                      style={{ width: '100%', minHeight: 100, marginBottom: 16 }} 
                      placeholder="Nhập nhận xét, đánh giá của bạn về kế hoạch và kết quả tuần này..."
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary" onClick={submitFeedback} disabled={submittingFeedback}>
                        {submittingFeedback ? 'Đang gửi...' : 'Gửi nhận xét'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!isViewingOthers && (
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '12px 24px', fontSize: 16 }}>
                {saving ? 'Đang gửi...' : 'Gửi Báo cáo Kế hoạch cho Quản lý'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
