'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { classApi } from '@/lib/api';
import { ArrowLeft, Check, X, Clock, Calendar, Save, Plus, ChevronRight, AlertCircle, RefreshCw, HelpCircle, Trash2, BarChart2, Users, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const classId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<Record<string, any>>({}); // studentId -> status
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'daily' | 'overview'>('daily');
  
  useEffect(() => {
    fetchClassData();
  }, [classId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      // Dữ liệu mẫu tạm thời trước khi có backend xịn, hoặc gọi API nếu đã deploy apps script
      // Tạm dùng logic mock để build UI trước
      
      const res = await classApi.getById(classId).catch(() => ({ data: null }));
      let cData = res?.data;
      
      // Kiểm tra xem dữ liệu trả về có hợp lệ không (phải là object, không phải string HTML, không có lỗi)
      if (!cData || typeof cData !== 'object' || !cData.id || cData.error) {
        // Fallback: Lấy danh sách tất cả các lớp và lọc ra lớp này (nếu Apps Script cũ chưa có getById)
        const allRes = await classApi.getAll().catch((err) => { 
          console.error("Fallback getAll error:", err);
          return { data: [] };
        });
        
        let allClasses = [];
        if (Array.isArray(allRes?.data)) {
          allClasses = allRes.data;
        } else if (allRes?.data?.data && Array.isArray(allRes.data.data)) {
          allClasses = allRes.data.data;
        }
        
        const decodedId = decodeURIComponent(classId);
        cData = allClasses.find((c: any) => String(c.id).trim() === String(classId).trim() || String(c.id).trim() === String(decodedId).trim());
        
        if (!cData) {
          setErrorMsg(`Không thể tải thông tin lớp học. classId=${classId}, Số lượng lớp lấy được=${allClasses.length}`);
          setLoading(false);
          return;
        }
      }
      
      setClassData(cData);
      
      const studentsList = cData.students ? cData.students.map((s: any) => ({
        id: s.id,
        name: s.fullName
      })) : [];
      setStudents(studentsList);

      // Gọi API lấy Sessions
      const sessRes = await classApi.getSessions(classId).catch(() => ({ data: [] }));
      let sessData = sessRes?.data || [];
      setSessions(sessData);
      if (sessData.length > 0) {
        setSelectedSessionId(sessData[0].id);
        loadAttendanceFromSession(sessData[0].id, sessData, studentsList);
      }

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const loadAttendanceFromSession = (sessionId: string, sessionList: any[], currentStudents: any[]) => {
    const session = sessionList.find(s => s.id === sessionId);
    let attData = session?.attendance || [];
    if (attData && attData.attendance) attData = attData.attendance;
    if (!Array.isArray(attData)) attData = [];
    
    const attMap: Record<string, any> = {};
    
    // Khởi tạo mặc định
    currentStudents.forEach(s => {
      attMap[s.id] = { status: 'NotMarked' }; // Mặc định là chưa điểm danh
    });
    
    // Ghi đè bằng dữ liệu thật
    attData.forEach((a: any) => {
      attMap[a.studentId] = a;
    });
    
    setAttendanceData(attMap);
  };

  const handleSessionChange = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    // Load local data immediately for fast UI switch
    loadAttendanceFromSession(sessionId, sessions, students);
  };

  const createNewSession = async () => {
    const topic = prompt("Nhập nội dung/tiêu đề buổi học mới:");
    if (!topic) return;
    
    const date = new Date().toISOString().split('T')[0];
    const newSess = {
      classId,
      date,
      topic,
      status: 'Active'
    };
    
    // Lưu session mới
    try {
      await classApi.createSession(classId, newSess);
      fetchClassData(); // tải lại danh sách
    } catch (err) {
      alert("Chưa lưu được buổi học mới vào CSDL. Hiện đang hiển thị tạm trên giao diện.");
      const mockId = 'sess-mock-' + Date.now();
      setSessions([...sessions, { ...newSess, id: mockId }]);
      setSelectedSessionId(mockId);
      
      const attMap: Record<string, any> = {};
      students.forEach(s => { attMap[s.id] = { status: 'NotMarked' }; });
      setAttendanceData(attMap);
    }
  };

  const handleStatusToggle = (studentId: string) => {
    setAttendanceData(prev => {
      const current = prev[studentId]?.status || 'NotMarked';
      let next = 'Present';
      if (current === 'NotMarked') next = 'Present';
      else if (current === 'Present') next = 'Absent';
      else if (current === 'Absent') next = 'Late';
      else next = 'NotMarked';
      
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          status: next,
          checkInTime: next === 'Present' || next === 'Late' ? new Date().toISOString() : null
        }
      };
    });
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const payload = students.map(s => ({
        sessionId: selectedSessionId,
        studentId: s.id,
        status: attendanceData[s.id]?.status || 'NotMarked',
        checkInTime: attendanceData[s.id]?.checkInTime || new Date().toISOString()
      }));
      
      await classApi.saveAttendance(selectedSessionId, payload);
      alert('Lưu điểm danh thành công!');
      
      // Cập nhật lại state sessions cục bộ
      setSessions(prev => prev.map(s => {
        if (s.id === selectedSessionId) {
          return { ...s, attendance: payload };
        }
        return s;
      }));

      // Tải lại dữ liệu mới nhất từ server để đảm bảo đồng bộ
      const sessRes = await classApi.getSessions(classId as string);
      if (sessRes?.data) {
        setSessions(sessRes.data);
      }
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi lưu vào Database! Vui lòng kiểm tra lại Apps Script.');
    }
    setSaving(false);
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa buổi học này? Toàn bộ dữ liệu điểm danh của buổi này sẽ bị mất!')) return;
    setSaving(true);
    try {
      await classApi.deleteSession(sessionId);
      alert('Đã xóa buổi học thành công!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa buổi học!');
    }
    setSaving(false);
  };

  const deleteAllSessions = async () => {
    if (!classId) return;
    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn XÓA TOÀN BỘ buổi học của lớp này? Hành động này không thể hoàn tác!')) return;
    
    const confirmText = prompt(`Gõ chữ "XOA" để xác nhận xóa toàn bộ lộ trình buổi học:`);
    if (confirmText !== "XOA") {
      alert("Hủy thao tác xóa.");
      return;
    }

    setSaving(true);
    try {
      await classApi.deleteAllSessions(classId as string);
      alert('Đã xóa toàn bộ buổi học thành công!');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa lộ trình buổi học!');
    }
    setSaving(false);
  };

  const handleAutoGenerateSessions = async () => {
    if (!classData || !classData.startDate || !classData.endDate || !classData.schedules) {
      alert("Lớp học chưa cấu hình đầy đủ Ngày bắt đầu, Ngày kết thúc và Lịch học.");
      return;
    }
    
    setSaving(true);
    try {
      const generatedSessions = [];
      const start = new Date(classData.startDate);
      const end = new Date(classData.endDate);
      let current = new Date(start);
      
      const getLocalDateString = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };

      while (current <= end) {
        const match = classData.schedules.find((s: any) => Number(s.dayOfWeek) === current.getDay());
        if (match) {
          generatedSessions.push({
            date: getLocalDateString(current),
            topic: ""
          });
        }
        current.setDate(current.getDate() + 1);
      }
      
      if (generatedSessions.length === 0) {
        alert("Không tìm thấy ngày học nào phù hợp với lịch học đã cấu hình.");
        setSaving(false);
        return;
      }
      
      await classApi.createSessionBulk(classData.id, generatedSessions);
      alert(`Đã tự động tạo ${generatedSessions.length} buổi học theo lịch học!`);
      fetchClassData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Đã xảy ra lỗi khi tạo lịch học tự động.");
    }
    setSaving(false);
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    
    // UTF-8 BOM cho Excel hiển thị tiếng Việt đúng
    let csvContent = "\uFEFF";
    
    // Header
    const headers = ['STT', 'Họ và tên học viên'];
    sessions.forEach((sess, idx) => {
      headers.push(`Buổi ${idx + 1} (${formatDisplayDate(sess.date)})`);
    });
    headers.push('Tổng Có mặt', 'Tổng Vắng', 'Tổng Trễ', 'Tỷ lệ chuyên cần (%)');
    csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
    
    // Rows
    overviewStats.forEach((st, idx) => {
      const row = [idx + 1, `"${st.name}"`];
      
      st.sessions.forEach((sessAtt: any) => {
        let val = '';
        if (sessAtt.status === 'Present') val = 'Có mặt';
        else if (sessAtt.status === 'Absent') val = 'Vắng mặt';
        else if (sessAtt.status === 'Late') val = 'Đi trễ';
        row.push(`"${val}"`);
      });
      
      row.push(st.present, st.absent, st.late, st.rate);
      csvContent += row.join(',') + '\n';
    });
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ThongKeDiemDanh_${classData?.className || 'LopHoc'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
        <RefreshCw className="spinner" size={32} color="var(--accent-blue)" />
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => router.push('/dashboard/classes')} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
            <ArrowLeft size={16} /> Quay lại
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Điểm danh</h1>
        </div>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
          <h3 style={{ color: 'var(--danger)', marginBottom: 8 }}>Lỗi tải dữ liệu</h3>
          <p style={{ color: 'var(--text-secondary)' }}>{errorMsg}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 24, margin: '0 auto' }}>
            <RefreshCw size={16} /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  // Hàm hiển thị ngày tháng đẹp (Cắt bỏ phần T00:00:00.000Z nếu có)
  const formatDisplayDate = (dString: string) => {
    if (!dString) return '';
    if (dString.includes('T')) {
      const parts = dString.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dString.split('T')[0];
    }
    // Nếu là YYYY-MM-DD
    const parts = dString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dString;
  };

  const overviewStats = students.map(student => {
    let present = 0;
    let absent = 0;
    let late = 0;
    
    const studentSessions = sessions.map(sess => {
      let attArray = sess.attendance || [];
      if (attArray && attArray.attendance) attArray = attArray.attendance;
      if (!Array.isArray(attArray)) attArray = [];
      
      const att = attArray.find((a: any) => a.studentId === student.id);
      const status = att?.status || 'NotMarked';
      if (status === 'Present') present++;
      else if (status === 'Absent') absent++;
      else if (status === 'Late') late++;
      return { sessionId: sess.id, date: formatDisplayDate(sess.date), status };
    });
    
    const total = present + absent + late;
    const rate = sessions.length > 0 ? Math.round((present / sessions.length) * 100) : 0;
    
    return {
      ...student,
      present,
      absent,
      late,
      total,
      rate,
      sessions: studentSessions
    };
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button 
          onClick={() => router.push('/dashboard/classes')}
          className="btn btn-secondary"
          style={{ padding: '8px 12px' }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Điểm danh: {classData?.className}</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            Giáo viên: {classData?.instructorName || 'Chưa gán'} • Sĩ số: {students.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <button 
          onClick={() => setActiveTab('daily')}
          className={`btn ${activeTab === 'daily' ? 'btn-primary' : ''}`}
          style={{ 
            padding: '8px 16px', 
            borderRadius: 20, 
            background: activeTab === 'daily' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
            color: activeTab === 'daily' ? 'white' : 'var(--text-primary)',
            border: `1px solid ${activeTab === 'daily' ? 'var(--accent-blue)' : 'var(--border)'}`
          }}
        >
          <Calendar size={18} /> Điểm danh Từng buổi
        </button>
        <button 
          onClick={() => setActiveTab('overview')}
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : ''}`}
          style={{ 
            padding: '8px 16px', 
            borderRadius: 20, 
            background: activeTab === 'overview' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
            color: activeTab === 'overview' ? 'white' : 'var(--text-primary)',
            border: `1px solid ${activeTab === 'overview' ? 'var(--accent-blue)' : 'var(--border)'}`
          }}
        >
          <BarChart2 size={18} /> Thống kê Tổng quát
        </button>
      </div>

      {activeTab === 'daily' ? (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        
        {/* Left Col: Sessions List */}
        <div style={{ flex: '0 0 280px' }}>
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={18} /> Các Buổi học
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {sessions.length > 0 && (
                  <button onClick={deleteAllSessions} disabled={saving} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', color: 'var(--danger)' }} title="Xóa toàn bộ">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={createNewSession} disabled={saving} className="btn btn-primary btn-sm" style={{ padding: '4px 8px' }} title="Thêm buổi học">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sessions.map((sess, idx) => {
                const isActive = sess.id === selectedSessionId;
                return (
                  <div 
                    key={sess.id}
                    onClick={() => handleSessionChange(sess.id)}
                    style={{ 
                      padding: '12px 16px', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      background: isActive ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: isActive ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border)'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Buổi {idx + 1}: {formatDisplayDate(sess.date)}</div>
                    <div style={{ fontSize: 12, opacity: isActive ? 0.9 : 0.6 }}>{sess.topic || 'Chưa có nội dung'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Attendance Grid */}
        <div style={{ flex: 1 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            {selectedSession ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 20, margin: 0 }}>Điểm danh Buổi {sessions.findIndex(s => s.id === selectedSessionId) + 1}</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>Ngày: {formatDisplayDate(selectedSession.date)} • {selectedSession.topic}</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                      onClick={() => deleteSession(selectedSessionId)}
                      disabled={saving}
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={18} /> 
                      Xóa buổi
                    </button>
                    <button 
                      onClick={saveAttendance}
                      disabled={saving}
                      className="btn btn-primary"
                    >
                      {saving ? <RefreshCw className="spinner" size={18} /> : <Save size={18} />} 
                      Lưu điểm danh
                    </button>
                  </div>
                </div>
                
                {/* Hướng dẫn thao tác */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, fontSize: 13, background: 'var(--bg-secondary)', padding: '10px 16px', borderRadius: 8 }}>
                  <span><strong>Cách điểm danh:</strong> Nhấn vào nút trạng thái của từng học viên để thay đổi.</span>
                  <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-muted)' }}/> Chưa ĐD</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)' }}/> Có mặt</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-red)' }}/> Vắng</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-orange)' }}/> Trễ</span>
                  </div>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60, textAlign: 'center' }}>STT</th>
                      <th>Họ và tên Học viên</th>
                      <th style={{ width: 180, textAlign: 'center' }}>Trạng thái (1-Chạm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length > 0 ? students.map((student, idx) => {
                      const status = attendanceData[student.id]?.status || 'NotMarked';
                      let btnClass = 'badge-green';
                      let btnIcon = <Check size={16} />;
                      let btnLabel = 'Có mặt';
                      
                      if (status === 'NotMarked') {
                        btnClass = '';
                        btnIcon = <HelpCircle size={16} />;
                        btnLabel = 'Chưa điểm danh';
                      } else if (status === 'Absent') {
                        btnClass = 'badge-red';
                        btnIcon = <X size={16} />;
                        btnLabel = 'Vắng mặt';
                      } else if (status === 'Late') {
                        btnClass = 'badge-orange';
                        btnIcon = <Clock size={16} />;
                        btnLabel = 'Đi trễ';
                      }
                      
                      return (
                        <tr key={student.id} style={{ transition: 'background 0.2s' }}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ fontWeight: 500, fontSize: 15 }}>{student.name}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleStatusToggle(student.id)}
                              className={`badge ${btnClass}`}
                              style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                                width: '100%', padding: '8px 12px', border: 'none', cursor: 'pointer',
                                fontSize: 14, fontWeight: 600, userSelect: 'none', transition: 'transform 0.1s'
                              }}
                              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                              {btnIcon} {btnLabel}
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                          Lớp chưa có học viên nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                <AlertCircle size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <p>Vui lòng chọn hoặc tạo Buổi học mới để bắt đầu điểm danh.</p>
                
                <div style={{ marginTop: 24, padding: 24, background: 'var(--bg-secondary)', borderRadius: 12, display: 'inline-block' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--text-primary)' }}>Chưa có buổi học nào</h4>
                  <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 300 }}>
                    Bạn có thể tự động tạo toàn bộ các buổi học dựa trên Lịch học và Ngày khai giảng của lớp này.
                  </p>
                  <button 
                    onClick={handleAutoGenerateSessions} 
                    disabled={saving}
                    className="btn btn-primary" 
                    style={{ margin: '0 auto' }}
                  >
                    {saving ? <RefreshCw className="spinner" size={16} /> : <Calendar size={16} />} 
                    Tự động tạo lộ trình điểm danh
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 24, overflowX: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={18} /> Thống kê Tổng quát Điểm danh
            </h3>
            <button 
              onClick={exportToCSV}
              disabled={students.length === 0}
              className="btn btn-secondary btn-sm" 
              style={{ padding: '6px 12px' }}
            >
              <Download size={16} /> Xuất file CSV
            </button>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', minWidth: 200 }}>Học viên</th>
                {sessions.map((sess, idx) => (
                  <th key={sess.id} style={{ padding: '12px 8px', borderBottom: '1px solid var(--border)', textAlign: 'center', minWidth: 60 }}>
                    B{idx + 1}<br/>
                    <span style={{ fontSize: 11, fontWeight: 'normal' }}>{formatDisplayDate(sess.date)}</span>
                  </th>
                ))}
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', borderLeft: '1px solid var(--border)', minWidth: 100 }}>Tổng kết</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', minWidth: 80 }}>Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              {overviewStats.length > 0 ? overviewStats.map((st, idx) => (
                <tr key={st.id} style={{ borderBottom: idx < overviewStats.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{st.name}</td>
                  {st.sessions.map((sessAtt: any) => {
                    let display = <span style={{ color: 'var(--text-muted)' }}>-</span>;
                    if (sessAtt.status === 'Present') display = <span style={{ color: 'var(--accent-green)' }}>V</span>;
                    else if (sessAtt.status === 'Absent') display = <span style={{ color: 'var(--danger)' }}>X</span>;
                    else if (sessAtt.status === 'Late') display = <span style={{ color: 'var(--accent-orange)' }}>T</span>;
                    
                    return (
                      <td key={sessAtt.sessionId} style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600 }}>
                        {display}
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 16px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', fontSize: 12 }}>
                      <span style={{ color: 'var(--accent-green)', fontWeight: 600 }} title="Có mặt">{st.present}</span>/
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }} title="Vắng mặt">{st.absent}</span>/
                      <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }} title="Đi trễ">{st.late}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: st.rate >= 80 ? 'var(--accent-green)' : (st.rate >= 50 ? 'var(--accent-orange)' : 'var(--danger)') }}>
                    {st.rate}%
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={sessions.length + 3} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Chưa có dữ liệu học viên
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--text-secondary)', justifyContent: 'flex-end', padding: '0 16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>V</span>: Có mặt</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--danger)', fontWeight: 600 }}>X</span>: Vắng mặt</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>T</span>: Đi trễ</span>
          </div>
        </div>
      )}
    </div>
  );
}
