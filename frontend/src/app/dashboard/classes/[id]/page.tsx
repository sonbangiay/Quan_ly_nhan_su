'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { classApi, employeeApi } from '@/lib/api';
import { 
  Users, Mail, Phone, Calendar, Clock, Loader2, Download,
  Edit2, X, Trash2, Plus, Upload
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ClassOverviewPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [classForm, setClassForm] = useState<any>({ className: '', subjectType: '', instructorId: '', startDate: '', endDate: '', schedules: [] });
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [showEnrollStudent, setShowEnrollStudent] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ studentId: '', fullName: '', phone: '', email: '', tuitionStatus: 3, learningGoal: '', notes: '' });
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [editingEnrollment, setEditingEnrollment] = useState<any>(null);
  const [editEnrollmentForm, setEditEnrollmentForm] = useState({ tuitionStatus: 3, learningGoal: '', notes: '' });
  const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const res = await classApi.getById(id);
        setClassData(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    const fetchEmps = async () => {
      try {
        const res = await employeeApi.getAll();
        setEmployees(res.data || []);
      } catch (e) {}
    };
    const fetchStudents = async () => {
      try {
        const res = await classApi.getStudents();
        setAllStudents(res.data?.data || res.data || []);
      } catch (e) {}
    };
    fetchClass();
    fetchEmps();
    fetchStudents();
  }, [id]);

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let finalStudentId = enrollForm.studentId;
      if (!finalStudentId && enrollForm.fullName && enrollForm.phone) {
        const createRes = await classApi.createStudent({ fullName: enrollForm.fullName, phone: enrollForm.phone, email: enrollForm.email || null, leadId: null });
        finalStudentId = createRes.data?.id || createRes.data?.data?.id;
      }
      if (!finalStudentId) throw new Error('Vui lòng chọn hoặc nhập đủ thông tin học viên');

      const selectedStudentObj = allStudents.find(s => s.id === finalStudentId) || { fullName: enrollForm.fullName, phone: enrollForm.phone, email: enrollForm.email };
      
      const payload = {
        studentId: finalStudentId,
        fullName: selectedStudentObj.fullName,
        phone: selectedStudentObj.phone,
        email: selectedStudentObj.email,
        tuitionStatus: Number(enrollForm.tuitionStatus),
        learningGoal: enrollForm.learningGoal || null,
        notes: enrollForm.notes || null
      };
      
      await classApi.enrollStudent(id, payload);
      setShowEnrollStudent(false);
      setEnrollForm({ studentId: '', fullName: '', phone: '', email: '', tuitionStatus: 3, learningGoal: '', notes: '' });
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Lỗi khi thêm học viên');
    }
    setSaving(false);
  };

  const handleRemoveStudent = async (enrollmentId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy ghi danh học viên này khỏi lớp?')) return;
    setSaving(true);
    try {
      await classApi.deleteEnrollment(enrollmentId);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi xóa học viên');
    }
    setSaving(false);
  };

  const handleBulkRemoveStudents = async () => {
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedEnrollmentIds.length} học viên đã chọn khỏi lớp?`)) return;
    setSaving(true);
    try {
      // Loop over and delete
      for (const id of selectedEnrollmentIds) {
        await classApi.deleteEnrollment(id);
      }
      window.location.reload();
    } catch (err: any) {
      alert('Lỗi khi xóa danh sách học viên');
    }
    setSaving(false);
  };

  const handleUpdateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEnrollment) return;
    setSaving(true);
    try {
      const payload = {
        tuitionStatus: Number(editEnrollmentForm.tuitionStatus),
        learningGoal: editEnrollmentForm.learningGoal || null,
        notes: editEnrollmentForm.notes || null
      };
      await classApi.updateEnrollment(editingEnrollment.id, payload);
      setEditingEnrollment(null);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi cập nhật học viên');
    }
    setSaving(false);
  };

  const handleSaveClassEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const insName = employees.find(e => e.id === classForm.instructorId)?.fullName || null;
      const payload = {
        className: classForm.className,
        subjectType: classForm.subjectType,
        instructorId: classForm.instructorId,
        instructorName: insName,
        startDate: classForm.startDate ? new Date(classForm.startDate).toISOString() : '',
        endDate: classForm.endDate ? new Date(classForm.endDate).toISOString() : '',
        schedules: classForm.schedules.map((s: any) => ({
          dayOfWeek: Number(s.dayOfWeek),
          startTime: s.startTime.length === 5 ? s.startTime + ':00' : s.startTime,
          endTime: s.endTime.length === 5 ? s.endTime + ':00' : s.endTime
        }))
      };
      await classApi.updateClass(id, payload);
      setIsEditingClass(false);
      window.location.reload(); // Quick refresh to update layout too
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi cập nhật lớp học');
    }
    setSaving(false);
  };

  const handleDeleteClass = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa lớp học này? Hành động này không thể hoàn tác!')) return;
    setSaving(true);
    try {
      await classApi.deleteClass(id);
      window.location.href = '/dashboard/classes';
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi xóa lớp học');
    }
    setSaving(false);
  };

  const addScheduleRow = () => {
    setClassForm((prev: any) => ({ ...prev, schedules: [...prev.schedules, { dayOfWeek: 1, startTime: '08:00', endTime: '10:00' }] }));
  };
  const removeScheduleRow = (index: number) => {
    setClassForm((prev: any) => ({ ...prev, schedules: prev.schedules.filter((_: any, i: number) => i !== index) }));
  };
  const updateScheduleRow = (index: number, field: string, value: any) => {
    setClassForm((prev: any) => {
      const updated = [...prev.schedules];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, schedules: updated };
    });
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="spinner inline-block" /></div>;
  if (!classData) return <div>Lớp không tồn tại</div>;

  const students = classData.students || [];
  const enrollments = classData.enrollments || [];

  const handleExcelExport = () => {
    const wsData = [
      ['HỌ VÀ TÊN', 'SỐ ĐIỆN THOẠI', 'EMAIL', 'TRẠNG THÁI HỌC PHÍ', 'MỤC TIÊU HỌC TẬP', 'GHI CHÚ']
    ];
    students.forEach((s: any) => {
      const en = enrollments.find((e: any) => e.studentId === s.id);
      wsData.push([
        s.fullName, 
        s.phone, 
        s.email || '', 
        en?.tuitionStatus === 1 ? 'Đã thu đủ' : en?.tuitionStatus === 2 ? 'Thu một phần' : 'Chưa thu',
        en?.learningGoal || '',
        en?.notes || ''
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách học viên");
    XLSX.writeFile(wb, `DanhSachHocVien_${classData.className}.xlsx`);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      let successCount = 0;
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0 || !row[0]) continue;
        
        const fullName = row[0];
        const phone = row[1] ? String(row[1]) : '';
        const email = row[2] ? String(row[2]) : '';
        const tuitionStr = row[3] ? String(row[3]).toLowerCase() : '';
        const learningGoal = row[4] ? String(row[4]) : '';
        const notes = row[5] ? String(row[5]) : '';

        let tuitionStatus = 3;
        if (tuitionStr.includes('đủ')) tuitionStatus = 1;
        else if (tuitionStr.includes('phần')) tuitionStatus = 2;

        let studentId = '';
        const existingStudent = allStudents.find(s => s.phone === phone || (s.email && s.email === email));
        if (existingStudent) {
          studentId = existingStudent.id;
        } else {
          const createRes = await classApi.createStudent({ fullName, phone, email: email || null, leadId: null });
          studentId = createRes.data?.id || createRes.data?.data?.id;
        }

        if (studentId) {
          const isEnrolled = enrollments.some((en:any) => en.studentId === studentId);
          if (!isEnrolled) {
            await classApi.enrollStudent(id, {
              studentId,
              fullName,
              phone,
              email,
              tuitionStatus,
              learningGoal,
              notes
            });
            successCount++;
          }
        }
      }
      
      alert(`Đã nhập thành công ${successCount} học viên mới vào lớp!`);
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi đọc file Excel. Vui lòng đảm bảo file được xuất từ hệ thống và giữ nguyên cấu trúc cột.');
    }
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusText = (status: number) => {
    if (status === 1) return <span className="badge badge-green">Đã thu đủ</span>;
    if (status === 2) return <span className="badge badge-yellow">Thu 1 phần</span>;
    return <span className="badge badge-red">Chưa thu</span>;
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const dayMap = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ===== HEADER INFO CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
        
        {/* Card: Quản lý Lớp học */}
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 20 }}>Quản lý chung</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, justifyContent: 'center' }}>
            <button className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => {
              setClassForm({
                className: classData.className,
                subjectType: classData.subjectType,
                instructorId: classData.instructorId || '',
                startDate: classData.startDate ? classData.startDate.split('T')[0] : '',
                endDate: classData.endDate ? classData.endDate.split('T')[0] : '',
                schedules: classData.schedules ? classData.schedules.map((s:any) => ({ dayOfWeek: s.dayOfWeek, startTime: formatTime(s.startTime), endTime: formatTime(s.endTime) })) : []
              });
              setIsEditingClass(true);
            }}>
              <Edit2 size={16} /> Chỉnh sửa lớp học
            </button>
            {user?.role === 'Admin' && (
              <button className="btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fee2e2', color: '#dc2626', border: 'none' }} onClick={handleDeleteClass}>
                <Trash2 size={16} /> Xóa lớp học
              </button>
            )}
          </div>
        </div>

        {/* Card: Thời gian */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 20 }}>Thời gian đào tạo</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Khai giảng</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{classData.startDate ? new Date(classData.startDate).toLocaleDateString('vi-VN') : 'Đang cập nhật'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={20} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bế giảng</div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{classData.endDate ? new Date(classData.endDate).toLocaleDateString('vi-VN') : 'Đang cập nhật'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card: Lịch học & Sĩ số */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 16 }}>Lịch học trong tuần</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {classData.schedules && classData.schedules.length > 0 ? (
              classData.schedules.map((s: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--accent-blue)' }}>
                    <Calendar size={16} /> {dayMap[s.dayOfWeek]}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <Clock size={14} /> {formatTime(s.startTime)} - {formatTime(s.endTime)}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
                Chưa cấu hình lịch học
              </div>
            )}
          </div>
          
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sĩ số hiện tại:</span>
            <span style={{ background: 'var(--accent-blue)', color: 'white', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
              <Users size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: '-2px' }} />
              {students.length}
            </span>
          </div>
        </div>
      </div>

      {/* ===== DANH SÁCH HỌC VIÊN ===== */}
      <div className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              Danh sách Học viên
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Quản lý thông tin và học phí của học viên trong lớp</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {selectedEnrollmentIds.length > 0 && (
              <button className="btn btn-danger" onClick={handleBulkRemoveStudents} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontWeight: 600 }}>
                <Trash2 size={18} /> Xóa đã chọn ({selectedEnrollmentIds.length})
              </button>
            )}
            <input type="file" ref={fileInputRef} hidden accept=".xlsx, .xls" onChange={handleExcelImport} />
            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontWeight: 600 }}>
              <Upload size={18} /> Nhập Excel
            </button>
            <button className="btn btn-secondary" onClick={handleExcelExport} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontWeight: 600 }}>
              <Download size={18} /> Xuất Excel
            </button>
            <button className="btn btn-primary" onClick={() => setShowEnrollStudent(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, fontWeight: 600 }}>
              <Plus size={18} /> Thêm Học viên
            </button>
          </div>
        </div>

        {students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-secondary)', borderRadius: 16, color: 'var(--text-muted)' }}>
            <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <div style={{ fontSize: 16, fontWeight: 500 }}>Lớp học này chưa có học viên nào</div>
            <p style={{ marginTop: 8, fontSize: 14 }}>Hãy nhấn nút "Thêm Học viên" để bắt đầu ghi danh</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto', margin: '0 -16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '16px 24px', width: 40 }}>
                    <input 
                      type="checkbox" 
                      checked={enrollments.length > 0 && selectedEnrollmentIds.length === enrollments.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedEnrollmentIds(enrollments.map((en: any) => en.id));
                        else setSelectedEnrollmentIds([]);
                      }}
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Học viên</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Liên hệ</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Học phí</th>
                  <th style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--text-secondary)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mục tiêu / Ghi chú</th>
                  <th style={{ padding: '16px 24px', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {students.map((student: any, idx: number) => {
                  const en = enrollments.find((e: any) => e.studentId === student.id);
                  return (
                    <tr key={student.id} style={{ borderBottom: idx === students.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.2s', background: en && selectedEnrollmentIds.includes(en.id) ? 'var(--bg-hover)' : 'transparent' }} onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'} onMouseLeave={e => e.currentTarget.style.background=en && selectedEnrollmentIds.includes(en.id) ? 'var(--bg-hover)' : 'transparent'}>
                      <td style={{ padding: '20px 24px' }}>
                        {en && (
                          <input 
                            type="checkbox" 
                            checked={selectedEnrollmentIds.includes(en.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedEnrollmentIds(prev => [...prev, en.id]);
                              else setSelectedEnrollmentIds(prev => prev.filter(id => id !== en.id));
                            }}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                            {student.fullName.charAt(0)}
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 15 }}>{student.fullName}</div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-primary)' }}><Phone size={14} color="var(--text-muted)"/> {student.phone}</div>
                          {student.email && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}><Mail size={14} color="var(--text-muted)"/> {student.email}</div>}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        {en ? (
                          <div style={{ 
                            display: 'inline-flex', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            background: en.tuitionStatus === 1 ? '#dcfce7' : en.tuitionStatus === 2 ? '#fef08a' : '#fee2e2',
                            color: en.tuitionStatus === 1 ? '#166534' : en.tuitionStatus === 2 ? '#854d0e' : '#991b1b'
                          }}>
                            {en.tuitionStatus === 1 ? 'Đã thu đủ' : en.tuitionStatus === 2 ? 'Thu 1 phần' : 'Chưa thu'}
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }}>---</span>}
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 250, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={en?.learningGoal || en?.notes || ''}>
                          {en?.learningGoal || en?.notes ? (
                            <span>{en?.learningGoal ? `MT: ${en.learningGoal} ` : ''} {en?.notes ? `- ${en.notes}` : ''}</span>
                          ) : (
                            <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Không có ghi chú</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        {en && (
                          <>
                            <button 
                              style={{ background: '#f0fdf4', color: '#166534', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
                              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
                              title="Sửa thông tin" 
                              onClick={() => {
                                setEditingEnrollment(en);
                                setEditEnrollmentForm({
                                  tuitionStatus: en.tuitionStatus || 3,
                                  learningGoal: en.learningGoal || '',
                                  notes: en.notes || ''
                                });
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              style={{ background: '#fee2e2', color: '#dc2626', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
                              onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
                              title="Xóa học viên khỏi lớp" 
                              onClick={() => handleRemoveStudent(en.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enroll Student Modal */}
      {showEnrollStudent && (
        <div className="modal-overlay" onClick={() => !saving && setShowEnrollStudent(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Thêm Học viên vào Lớp</h2>
              <button className="btn-icon" onClick={() => !saving && setShowEnrollStudent(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEnrollStudent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Chọn học viên cũ (Có sẵn)</label>
                <select className="form-input" value={enrollForm.studentId} onChange={e => {
                  const s = allStudents.find(x => x.id === e.target.value);
                  setEnrollForm({...enrollForm, studentId: e.target.value, fullName: s?.fullName||'', phone: s?.phone||'', email: s?.email||''});
                }}>
                  <option value="">-- Chọn học viên --</option>
                  {allStudents.map(s => <option key={s.id} value={s.id}>{s.fullName} - {s.phone}</option>)}
                </select>
              </div>

              {!enrollForm.studentId && (
                <>
                  <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>HOẶC NHẬP HỌC VIÊN MỚI</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div><label className="form-label">Họ và tên *</label><input required className="form-input" value={enrollForm.fullName} onChange={e => setEnrollForm({...enrollForm, fullName: e.target.value})} /></div>
                    <div><label className="form-label">Số điện thoại *</label><input required className="form-input" value={enrollForm.phone} onChange={e => setEnrollForm({...enrollForm, phone: e.target.value})} /></div>
                  </div>
                </>
              )}

              <div>
                <label className="form-label">Trạng thái học phí *</label>
                <select className="form-input" value={enrollForm.tuitionStatus} onChange={e => setEnrollForm({...enrollForm, tuitionStatus: Number(e.target.value)})}>
                  <option value={1}>Đã thu đủ</option>
                  <option value={2}>Thu 1 phần</option>
                  <option value={3}>Chưa thu</option>
                </select>
              </div>

              <div><label className="form-label">Mục tiêu / Ghi chú</label><input className="form-input" value={enrollForm.notes} onChange={e => setEnrollForm({...enrollForm, notes: e.target.value})} /></div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEnrollStudent(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="spinner" /> : 'Lưu vào lớp'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Enrollment Modal */}
      {editingEnrollment && (
        <div className="modal-overlay" onClick={() => !saving && setEditingEnrollment(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Cập nhật thông tin Học viên</h2>
              <button className="btn-icon" onClick={() => !saving && setEditingEnrollment(null)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdateEnrollment} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{editingEnrollment.studentName || editingEnrollment.fullName || 'Học viên'}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cập nhật trạng thái học phí và mục tiêu / ghi chú.</div>
              </div>
              
              <div>
                <label className="form-label">Trạng thái học phí *</label>
                <select className="form-input" value={editEnrollmentForm.tuitionStatus} onChange={e => setEditEnrollmentForm({...editEnrollmentForm, tuitionStatus: Number(e.target.value)})}>
                  <option value={1}>Đã thu đủ</option>
                  <option value={2}>Thu 1 phần</option>
                  <option value={3}>Chưa thu</option>
                </select>
              </div>

              <div><label className="form-label">Mục tiêu</label><input className="form-input" value={editEnrollmentForm.learningGoal} onChange={e => setEditEnrollmentForm({...editEnrollmentForm, learningGoal: e.target.value})} /></div>
              <div><label className="form-label">Ghi chú</label><input className="form-input" value={editEnrollmentForm.notes} onChange={e => setEditEnrollmentForm({...editEnrollmentForm, notes: e.target.value})} /></div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingEnrollment(null)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Loader2 size={16} className="spinner" /> : 'Lưu thay đổi'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {isEditingClass && (
        <div className="modal-overlay" onClick={() => setIsEditingClass(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: 600, maxWidth: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Cập nhật Thông tin Lớp học</h2>
              <button className="btn-icon" onClick={() => setIsEditingClass(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSaveClassEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><label className="form-label">Tên lớp / Mã lớp *</label><input className="form-input" required value={classForm.className} onChange={e => setClassForm({...classForm, className: e.target.value})} /></div>
                <div><label className="form-label">Môn học / Phân loại *</label><input className="form-input" required value={classForm.subjectType} onChange={e => setClassForm({...classForm, subjectType: e.target.value})} /></div>
              </div>
              
              <div>
                <label className="form-label">Giảng viên phụ trách</label>
                <select className="form-input" value={classForm.instructorId} onChange={e => setClassForm({...classForm, instructorId: e.target.value})}>
                  <option value="">-- Chưa phân công --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName} {emp.role ? `(${emp.role})` : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div><label className="form-label">Ngày khai giảng (Dự kiến)</label><input type="date" className="form-input" value={classForm.startDate} onChange={e => setClassForm({...classForm, startDate: e.target.value})} /></div>
                <div><label className="form-label">Ngày bế giảng (Dự kiến)</label><input type="date" className="form-input" value={classForm.endDate} onChange={e => setClassForm({...classForm, endDate: e.target.value})} /></div>
              </div>

              <div>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Lịch học định kỳ</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addScheduleRow} style={{ padding: '2px 8px', fontSize: 12 }}><Plus size={12} /> Thêm buổi</button>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                  {classForm.schedules.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có lịch học nào</div>
                  ) : classForm.schedules.map((schedule: any, index: number) => (
                    <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select className="form-input" value={schedule.dayOfWeek} onChange={e => updateScheduleRow(index, 'dayOfWeek', e.target.value)}>
                        <option value="1">Thứ 2</option><option value="2">Thứ 3</option><option value="3">Thứ 4</option><option value="4">Thứ 5</option><option value="5">Thứ 6</option><option value="6">Thứ 7</option><option value="0">Chủ nhật</option>
                      </select>
                      <input type="time" className="form-input" value={schedule.startTime} onChange={e => updateScheduleRow(index, 'startTime', e.target.value)} />
                      <span>-</span>
                      <input type="time" className="form-input" value={schedule.endTime} onChange={e => updateScheduleRow(index, 'endTime', e.target.value)} />
                      <button type="button" className="btn-icon text-danger" onClick={() => removeScheduleRow(index)}><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                <button type="button" className="btn btn-danger" disabled={saving} onClick={handleDeleteClass}>
                  {saving ? 'Đang xóa...' : <><Trash2 size={16} /> Xóa Lớp</>}
                </button>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditingClass(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <Loader2 size={16} className="spinner" /> : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

