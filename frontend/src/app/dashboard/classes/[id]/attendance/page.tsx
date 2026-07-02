'use client';
import { useState, useEffect, use, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { classApi } from '@/lib/api';
import { ArrowLeft, Check, X, Clock, Calendar, Save, Plus, ChevronRight, AlertCircle, RefreshCw, HelpCircle, Trash2, BarChart2, Users, Download, Edit2, PlayCircle, FileText, MonitorPlay, Link as LinkIcon, Search, Upload, Table } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ElearningBuilder from './ElearningBuilder';
import * as XLSX from 'xlsx';

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
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [sessionEvaluation, setSessionEvaluation] = useState<string>('');
  const [sessionTopic, setSessionTopic] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'daily' | 'overview' | 'syllabus'>('daily');
  const [editingSession, setEditingSession] = useState<any>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({ date: '', topic: '' });
  const [elearningProgressData, setElearningProgressData] = useState<any[]>([]);
  const [searchSessionQuery, setSearchSessionQuery] = useState('');
  const [searchSyllabusQuery, setSearchSyllabusQuery] = useState('');
  
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
      
      const elpRes = await classApi.getAllElearningProgress(classId as string).catch(() => ({ data: [] }));
      setElearningProgressData(elpRes?.data || []);

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
    const session = sessions.find(s => s.id === sessionId);
    setSessionNotes(session?.notes || '');
    setSessionEvaluation(session?.evaluation || '');
    setSessionTopic(session?.topic || '');
    
    // Đảm bảo sessionDate luôn đúng chuẩn YYYY-MM-DD để hiển thị trong input type="date"
    let d = session?.date || '';
    if (d && d.includes('/')) {
      const p = d.split('/');
      if (p.length === 3) d = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    } else if (d && d.includes('T')) {
      d = d.split('T')[0];
    }
    setSessionDate(d);
    
    // Load local data immediately for fast UI switch
    loadAttendanceFromSession(sessionId, sessions, students);
  };

  // Ensure selectedSessionId is valid when search changes
  useEffect(() => {
    if (sessions.length > 0) {
      const filtered = sessions.filter(sess => {
        if (!searchSessionQuery) return true;
        const q = searchSessionQuery.toLowerCase();
        const sessionDateStr = formatDisplayDate(sess.date);
        const topicStr = (sess.topic || '').toLowerCase();
        const dayNameStr = (sess.dayName || '').toLowerCase();
        const weekStr = (sess.week || '').toLowerCase();
        const idxStr = `buổi ${sessions.findIndex(s => s.id === sess.id) + 1}`;
        return sessionDateStr.includes(q) || topicStr.includes(q) || idxStr.includes(q) || dayNameStr.includes(q) || weekStr.includes(q);
      });
      
      if (filtered.length > 0 && !filtered.find(s => s.id === selectedSessionId)) {
        handleSessionChange(filtered[0].id);
      }
    }
  }, [searchSessionQuery, sessions]);

  const openAddSessionModal = () => {
    // Determine next date
    let nextDate = new Date();
    
    if (sessions.length > 0) {
      // Find the latest date
      const sortedSessions = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const lastSessionDate = new Date(sortedSessions[sortedSessions.length - 1].date);
      
      // Look for the next schedule day after lastSessionDate
      nextDate = new Date(lastSessionDate);
      nextDate.setDate(nextDate.getDate() + 1);
      
      if (classData && classData.schedules && classData.schedules.length > 0) {
        const scheduleDays = classData.schedules.map((s: any) => Number(s.dayOfWeek));
        // Find next valid day
        for (let i = 0; i < 7; i++) {
          if (scheduleDays.includes(nextDate.getDay())) {
            break;
          }
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
    } else if (classData && classData.startDate) {
      nextDate = new Date(classData.startDate);
      // Ensure it's a schedule day
      if (classData && classData.schedules && classData.schedules.length > 0) {
        const scheduleDays = classData.schedules.map((s: any) => Number(s.dayOfWeek));
        for (let i = 0; i < 7; i++) {
          if (scheduleDays.includes(nextDate.getDay())) {
            break;
          }
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
    }
    
    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    
    setNewSessionForm({ date: `${yyyy}-${mm}-${dd}`, topic: '' });
    setShowAddSession(true);
  };

  const submitNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionForm.date) return;
    
    setSaving(true);
    const newSess = {
      classId,
      date: newSessionForm.date,
      topic: newSessionForm.topic,
      status: 'Active'
    };
    
    // Lưu session mới
    try {
      await classApi.createSession(classId, newSess);
      setShowAddSession(false);
      fetchClassData(); // tải lại danh sách
    } catch (err) {
      alert("Chưa lưu được buổi học mới vào CSDL. Hiện đang hiển thị tạm trên giao diện.");
      const mockId = 'sess-mock-' + Date.now();
      setSessions([...sessions, { ...newSess, id: mockId }]);
      setSelectedSessionId(mockId);
      setShowAddSession(false);
      
      const attMap: Record<string, any> = {};
      students.forEach(s => { attMap[s.id] = { status: 'NotMarked' }; });
      setAttendanceData(attMap);
    }
    setSaving(false);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImportSyllabus = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      // Dùng raw: false để lấy đúng chuỗi ngày tháng hiển thị trên Excel (ngăn Excel tự đảo ngày/tháng)
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      
      // Tìm dòng tiêu đề
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(20, jsonData.length); i++) {
        const row = jsonData[i] as any[];
        if (row && row.some(cell => typeof cell === 'string' && cell.toUpperCase().includes('NỘI DUNG'))) {
          headerRowIdx = i;
          break;
        }
      }
      
      if (headerRowIdx === -1) {
        alert("Không tìm thấy dòng tiêu đề chứa 'NỘI DUNG'. Vui lòng kiểm tra lại file Excel.");
        setSaving(false);
        return;
      }
      
      const headerRow = jsonData[headerRowIdx] as string[];
      let weekColIdx = -1, dayColIdx = -1, contentColIdx = -1, dateColIdx = -1, evaluationColIdx = -1;
      
      headerRow.forEach((h, idx) => {
        if (typeof h === 'string') {
          const upperH = h.toUpperCase();
          if (upperH.includes('TUẦN')) weekColIdx = idx;
          else if (upperH.includes('NGÀY') && !upperH.includes('ĐÁNH GIÁ')) dayColIdx = idx;
          else if (upperH.includes('NỘI DUNG')) contentColIdx = idx;
          else if (upperH.includes('THỜI GIAN')) dateColIdx = idx;
          else if (upperH.includes('ĐÁNH GIÁ')) evaluationColIdx = idx;
        }
      });
      
      if (contentColIdx === -1 || dayColIdx === -1) {
        alert("Thiếu cột 'NGÀY' hoặc 'NỘI DUNG'.");
        setSaving(false);
        return;
      }
      
      const newSessions = [];
      let currentWeek = '';
      
      for (let i = headerRowIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (!row || row.length === 0) continue;
        
        const weekVal = row[weekColIdx];
        if (weekVal && typeof weekVal === 'string' && weekVal.trim() !== '') {
          currentWeek = weekVal.trim();
        }
        
        const dayVal = row[dayColIdx];
        const contentVal = row[contentColIdx];
        const dateVal = dateColIdx !== -1 ? row[dateColIdx] : null;
        const evalVal = evaluationColIdx !== -1 ? row[evaluationColIdx] : null;
        
        if (dayVal || contentVal || dateVal || evalVal) {
          const contentStr = contentVal ? String(contentVal).trim() : '';
          const firstLine = contentStr.split('\n')[0].trim();
          
          let generatedTopic = 'Buổi học mới';
          if (firstLine) {
            generatedTopic = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
          } else if (evalVal) {
            generatedTopic = 'Đánh giá / Kiểm tra';
          }
          
          let parsedDate = '';
          if (dateVal) {
            // Do raw: false, dateVal luôn là string theo đúng những gì hiển thị trên Excel
            let dStr = String(dateVal).trim();
            // Xử lý các dấu phân cách thông dụng
            dStr = dStr.replace(/-/g, '/').replace(/\./g, '/');
            
            const parts = dStr.split('/');
            if (parts.length === 3) {
              // Ở VN, người dùng luôn gõ DD/MM/YYYY
              const d = parts[0].padStart(2, '0');
              const m = parts[1].padStart(2, '0');
              const y = parts[2].length === 2 ? '20' + parts[2] : parts[2];
              parsedDate = `${y}-${m}-${d}`;
            } else {
              // Fallback nếu không phải định dạng D/M/Y
              const dObj = new Date(dStr);
              if (!isNaN(dObj.getTime())) {
                parsedDate = dObj.toISOString().split('T')[0];
              }
            }
          }
          
          newSessions.push({
            week: currentWeek,
            dayName: dayVal ? String(dayVal).trim() : '',
            topic: generatedTopic,
            notes: contentStr,
            date: parsedDate,
            evaluation: evalVal ? String(evalVal).trim() : '',
            status: parsedDate ? 'Active' : 'Pending',
            order: newSessions.length + 1
          });
        }
      }
      
      if (newSessions.length === 0) {
        alert("Không tìm thấy dữ liệu lộ trình trong file.");
        setSaving(false);
        return;
      }
      
      await classApi.createSessionBulk(classId, newSessions);
      alert(`Đã nhập thành công ${newSessions.length} buổi học!`);
      fetchClassData();
    } catch (error) {
      console.error(error);
      alert('Lỗi khi đọc file Excel');
    }
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      
      // Save notes & evaluation
      await classApi.updateSession(selectedSessionId, {
        notes: sessionNotes,
        evaluation: sessionEvaluation,
        topic: sessionTopic,
        date: sessionDate
      });

      alert('Lưu dữ liệu buổi học thành công!');
      
      // Cập nhật lại state sessions cục bộ
      setSessions(prev => prev.map(s => {
        if (s.id === selectedSessionId) {
          return { ...s, attendance: payload, notes: sessionNotes, evaluation: sessionEvaluation, topic: sessionTopic, date: sessionDate };
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

  const openEditSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    setEditingSession({ 
      ...session,
      topic: sessionTopic || session.topic || '',
      date: sessionDate || session.date || ''
    });
  };

  const saveEditedSession = async () => {
    if (!editingSession) return;
    
    setSaving(true);
    try {
      await classApi.updateSession(editingSession.id, { 
        topic: editingSession.topic || '', 
        date: editingSession.date || '',
        videoUrl: editingSession.videoUrl || '',
        materialUrl: editingSession.materialUrl || ''
      });
      alert('Đã cập nhật thông tin buổi học!');
      
      setSessions(prev => prev.map(s => {
        if (s.id === editingSession.id) {
          return { ...s, ...editingSession };
        }
        return s;
      }));
      setSessionTopic(editingSession.topic || '');
      setSessionDate(editingSession.date || '');
      setEditingSession(null);
    } catch (err: any) {
      console.error(err);
      alert('Lỗi khi cập nhật buổi học: ' + (err.message || 'Unknown error'));
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

  const exportSyllabusToExcel = () => {
    if (sessions.length === 0) return;
    
    const data = [
      ["Ngày", "Thời gian dạy", "Nội dung chi tiết", "Đánh giá học sinh"]
    ];

    sessions.forEach(sess => {
      data.push([
        sess.dayName || '',
        sess.date ? formatDisplayDate(sess.date) : '',
        `${sess.topic || ''}\n${sess.notes || ''}`.trim(),
        sess.evaluation || ''
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Tùy chỉnh độ rộng cột
    worksheet['!cols'] = [
      { wch: 10 }, // Ngày
      { wch: 15 }, // Thời gian dạy
      { wch: 50 }, // Nội dung chi tiết
      { wch: 40 }  // Đánh giá học sinh
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Syllabus");
    
    XLSX.writeFile(workbook, `LoTrinh_${classData?.className || 'LopHoc'}.xlsx`);
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
    
    // Tính tiến độ E-learning
    const ep = elearningProgressData.find(e => e.studentId === student.id);
    const completedVideosCount = ep?.progress?.length || 0;
    const elearningRate = sessions.length > 0 ? Math.round((completedVideosCount / sessions.length) * 100) : 0;
    
    return {
      ...student,
      present,
      absent,
      late,
      total,
      rate,
      elearningRate,
      sessions: studentSessions
    };
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>

      {classData?.isOnlineCourse ? (
        <ElearningBuilder classId={classId as string} initialSessions={sessions} onSessionsUpdated={setSessions} />
      ) : (
        <>
          {/* Tabs */}
          <div className="tabs-container" style={{ marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
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
        <button 
          onClick={() => setActiveTab('syllabus')}
          className={`btn ${activeTab === 'syllabus' ? 'btn-primary' : ''}`}
          style={{ 
            padding: '8px 16px', 
            borderRadius: 20, 
            background: activeTab === 'syllabus' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
            color: activeTab === 'syllabus' ? 'white' : 'var(--text-primary)',
            border: `1px solid ${activeTab === 'syllabus' ? 'var(--accent-blue)' : 'var(--border)'}`
          }}
        >
          <Table size={18} /> Bảng Lộ trình (Excel)
        </button>
      </div>

      {activeTab === 'daily' ? (
        <div className="attendance-layout">
        
        {/* Left Col: Sessions List */}
        <div className="sessions-sidebar">
          <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={18} /> Các Buổi học
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="file" accept=".xlsx,.xls,.csv" ref={fileInputRef} onChange={handleImportSyllabus} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={saving} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} title="Nhập lộ trình từ Excel">
                  <Upload size={16} />
                </button>
                {sessions.length > 0 && (
                  <button onClick={deleteAllSessions} disabled={saving} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', color: 'var(--danger)' }} title="Xóa toàn bộ">
                    <Trash2 size={16} />
                  </button>
                )}
                <button onClick={openAddSessionModal} disabled={saving} className="btn btn-primary btn-sm" style={{ padding: '4px 8px' }} title="Thêm buổi học">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            <div style={{ marginBottom: 16, position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Tìm ngày, buổi, nội dung..." 
                value={searchSessionQuery}
                onChange={e => setSearchSessionQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: 34, fontSize: 13, height: 36, borderRadius: 20 }}
              />
            </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
              {sessions.filter(sess => {
                if (!searchSessionQuery) return true;
                const q = searchSessionQuery.toLowerCase();
                const sessionDateStr = formatDisplayDate(sess.date);
                const topicStr = (sess.topic || '').toLowerCase();
                const dayNameStr = (sess.dayName || '').toLowerCase();
                const weekStr = (sess.week || '').toLowerCase();
                const idxStr = `buổi ${sessions.findIndex(s => s.id === sess.id) + 1}`;
                return sessionDateStr.includes(q) || topicStr.includes(q) || idxStr.includes(q) || dayNameStr.includes(q) || weekStr.includes(q);
              }).map((sess) => {
                const idx = sessions.findIndex(s => s.id === sess.id);
                const isActive = sess.id === selectedSessionId;
                return (
                  <div 
                    key={sess.id}
                    onClick={() => handleSessionChange(sess.id)}
                    style={{ 
                      padding: '12px', 
                      borderRadius: 8, 
                      cursor: 'pointer',
                      background: isActive ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                      color: isActive ? 'white' : 'var(--text-primary)',
                      border: `1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border)'}`,
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{sess.dayName ? sess.dayName.split(':')[0] : `Buổi ${idx + 1}`}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--bg-primary)', padding: '2px 8px', borderRadius: 12 }}>
                        {sess.date ? formatDisplayDate(sess.date) : 'Chưa học'}
                      </span>
                    </div>
                    {sess.topic && sess.topic.includes(':') && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'white' : 'var(--accent-blue)' }}>
                        🕒 {sess.topic.split(':')[0].replace(/^- /g, '').trim()}
                      </div>
                    )}
                    <div style={{ fontSize: 12, opacity: isActive ? 0.9 : 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sess.topic && sess.topic.includes(':') ? sess.topic.split(':').slice(1).join(':').trim() : (sess.topic || 'Chưa có nội dung')}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginTop: 2 }}>
                      {sess.videoUrl && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><PlayCircle size={12} /> Có Video</span>}
                      {sess.materialUrl && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> Tài liệu</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Attendance Grid */}
        <div className="attendance-main">
          <div className="glass-card mobile-p-16" style={{ padding: 24 }}>
            {selectedSession ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 20, margin: 0 }}>Điểm danh {selectedSession?.dayName ? `${selectedSession.week ? selectedSession.week + ' - ' : ''}${selectedSession.dayName}` : `Buổi ${sessions.findIndex(s => s.id === selectedSessionId) + 1}`}</h2>
                      <input type="date" className="form-input" style={{ padding: '4px 8px', height: 32, fontSize: 14 }} value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                      <input type="text" className="form-input" style={{ padding: '4px 8px', height: 32, fontSize: 14, minWidth: 200, flex: 1 }} placeholder="Tên bài học/Chủ đề" value={sessionTopic} onChange={e => setSessionTopic(e.target.value)} />
                    </div>
                    <div style={{ margin: '4px 0 0', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => openEditSession(selectedSessionId)} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12, whiteSpace: 'nowrap', borderRadius: 20 }}>
                        <Edit2 size={14} /> Sửa Video & Tài liệu
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button 
                      onClick={() => deleteSession(selectedSessionId)}
                      disabled={saving}
                      className="btn btn-secondary"
                      style={{ color: 'var(--danger)', whiteSpace: 'nowrap' }}
                    >
                      <Trash2 size={18} /> 
                      Xóa buổi
                    </button>
                    <button 
                      onClick={saveAttendance}
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {saving ? <RefreshCw className="spinner" size={18} /> : <Save size={18} />} 
                      Lưu dữ liệu buổi học
                    </button>
                  </div>
                </div>


                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 16, flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Danh sách điểm danh</h3>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>Sĩ số: <strong style={{ color: 'var(--text-primary)' }}>{Object.values(attendanceData).filter((a: any) => a.status === 'Present').length}/{students.length}</strong></span>
                      <span style={{ color: 'var(--danger)' }}>(Vắng {Object.values(attendanceData).filter((a: any) => a.status === 'Absent').length})</span>
                      <span style={{ color: 'var(--accent-orange)' }}>(Trễ {Object.values(attendanceData).filter((a: any) => a.status === 'Late').length})</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ padding: '6px 12px', borderRadius: 20 }}
                      onClick={() => {
                        const newAtt = { ...attendanceData };
                        students.forEach(st => {
                          if (newAtt[st.id]?.status === 'NotMarked' || !newAtt[st.id]) {
                            newAtt[st.id] = { status: 'Present' };
                          }
                        });
                        setAttendanceData(newAtt);
                      }}
                      title="Đánh dấu tất cả học sinh chưa điểm danh là Có mặt"
                    >
                      <Check size={14} style={{ color: 'var(--accent-green)' }} /> Điểm danh nhanh (Tất cả Có mặt)
                    </button>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-muted)' }}></div> Chưa ĐD
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-green)' }}></div> Có mặt
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 12 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--danger)' }}></div> Vắng
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-orange)' }}></div> Trễ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="table-responsive desktop-only">

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
              </div>

              {/* Mobile Card View for Attendance */}
              <div className="mobile-only" style={{ marginTop: 16 }}>
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
                    <div key={student.id} className="mobile-card" style={{ marginBottom: 0 }}>
                      <div className="mobile-card-title" style={{ fontSize: 18, marginBottom: 16 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>#{idx + 1}</span>
                        {student.name}
                      </div>
                      <button
                        onClick={() => handleStatusToggle(student.id)}
                        className={`badge ${btnClass}`}
                        style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, 
                          width: '100%', padding: '14px', border: 'none', cursor: 'pointer',
                          fontSize: 16, fontWeight: 700, userSelect: 'none', transition: 'transform 0.1s',
                          borderRadius: 12
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {btnIcon} {btnLabel}
                      </button>
                    </div>
                  );
                }) : (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    Lớp chưa có học viên nào.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 24, marginTop: 32, paddingTop: 32, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Nội dung / Chi tiết buổi học</label>
                  <textarea 
                    className="form-input" 
                    style={{ width: '100%', minHeight: 100, padding: 12, fontSize: 14 }}
                    placeholder="Nhập nội dung chi tiết..."
                    value={sessionNotes}
                    onChange={e => setSessionNotes(e.target.value)}
                  />
                </div>
                
                <div style={{ flex: 1, minWidth: 250 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Nhận xét / Đánh giá lớp học</label>
                  <textarea 
                    className="form-input" 
                    style={{ width: '100%', minHeight: 100, padding: 12, fontSize: 14, background: 'var(--bg-secondary)' }}
                    placeholder="Nhập nhận xét chung về thái độ, mức độ tiếp thu của lớp..."
                    value={sessionEvaluation}
                    onChange={e => setSessionEvaluation(e.target.value)}
                  />
                </div>
              </div>
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
      ) : activeTab === 'overview' ? (
        <div className="glass-card mobile-p-16" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
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
          
          <div className="table-responsive desktop-only">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'rgba(0,102,255,0.05)', color: 'var(--accent-blue)' }}>
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', minWidth: 200, fontWeight: 700 }}>Học viên</th>
                {sessions.map((sess, idx) => (
                  <th key={sess.id} style={{ padding: '14px 8px', borderBottom: '2px solid rgba(0,102,255,0.2)', textAlign: 'center', minWidth: 60, fontWeight: 700 }}>
                    B{idx + 1}<br/>
                    <span style={{ fontSize: 11, fontWeight: 'normal', opacity: 0.8 }}>{formatDisplayDate(sess.date)}</span>
                  </th>
                ))}
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', textAlign: 'center', borderLeft: '1px solid rgba(0,102,255,0.2)', minWidth: 100, fontWeight: 700 }}>Tổng kết</th>
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', textAlign: 'center', minWidth: 80, fontWeight: 700 }}>Tỷ lệ đi học</th>
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', textAlign: 'center', minWidth: 100, fontWeight: 700 }}>Tiến độ E-learning</th>
              </tr>
            </thead>
            <tbody>
              {overviewStats.length > 0 ? overviewStats.map((st, idx) => (
                <tr key={st.id} style={{ borderBottom: idx < overviewStats.length - 1 ? '1px solid var(--border)' : 'none', transition: 'all 0.2s', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,102,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'}>
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
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: st.elearningRate >= 80 ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
                    {st.elearningRate}%
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
          </div>

          {/* Mobile Card View for Overview */}
          <div className="mobile-only">
            {overviewStats.length > 0 ? overviewStats.map((st, idx) => (
              <div key={st.id} className="mobile-card" style={{ marginBottom: 0 }}>
                <div className="mobile-card-title">
                  {st.name}
                </div>
                <div className="mobile-card-row">
                  <span className="mobile-card-label">Tổng kết (V/X/T):</span>
                  <span className="mobile-card-value" style={{ display: 'flex', gap: 12 }}>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{st.present} Có mặt</span>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{st.absent} Vắng</span>
                    <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{st.late} Trễ</span>
                  </span>
                </div>
                <div className="mobile-card-row" style={{ alignItems: 'center' }}>
                  <span className="mobile-card-label">Tỷ lệ đi học:</span>
                  <span className="mobile-card-value" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: st.rate >= 80 ? 'var(--accent-green)' : (st.rate >= 50 ? 'var(--accent-orange)' : 'var(--danger)'), fontWeight: 700, minWidth: 40 }}>
                      {st.rate}%
                    </span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${st.rate}%`, height: '100%', background: st.rate >= 80 ? 'var(--accent-green)' : (st.rate >= 50 ? 'var(--accent-orange)' : 'var(--danger)'), borderRadius: 4 }}></div>
                    </div>
                  </span>
                </div>
                <div className="mobile-card-row" style={{ alignItems: 'center' }}>
                  <span className="mobile-card-label">E-Learning:</span>
                  <span className="mobile-card-value" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: st.elearningRate >= 80 ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: 700, minWidth: 40 }}>
                      {st.elearningRate}%
                    </span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${st.elearningRate}%`, height: '100%', background: st.elearningRate >= 80 ? 'var(--accent-purple)' : 'var(--text-secondary)', borderRadius: 4 }}></div>
                    </div>
                  </span>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Chưa có dữ liệu học viên
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--text-secondary)', justifyContent: 'flex-end', padding: '0 16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>V</span>: Có mặt</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--danger)', fontWeight: 600 }}>X</span>: Vắng mặt</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>T</span>: Đi trễ</span>
          </div>
        </div>
      ) : (
        <div className="glass-card mobile-p-16" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Table size={18} /> Lộ trình & Đánh giá toàn bộ buổi học
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', width: 300 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Tìm nội dung, đánh giá..." 
                  value={searchSyllabusQuery}
                  onChange={e => setSearchSyllabusQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34, fontSize: 13, height: 36, borderRadius: 20 }}
                />
              </div>
              <button 
                onClick={exportSyllabusToExcel}
                disabled={sessions.length === 0}
                className="btn btn-secondary btn-sm" 
                style={{ padding: '6px 16px', height: 36, borderRadius: 20 }}
              >
                <Download size={16} /> Xuất file Excel
              </button>
            </div>
          </div>
          
          <div className="table-responsive desktop-only">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'rgba(0,102,255,0.05)', color: 'var(--accent-blue)' }}>
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', minWidth: 80, fontWeight: 700 }}>Ngày</th>
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', minWidth: 120, fontWeight: 700 }}>Thời gian dạy</th>
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', minWidth: 300, fontWeight: 700 }}>Nội dung chi tiết</th>
                <th style={{ padding: '14px 16px', borderBottom: '2px solid rgba(0,102,255,0.2)', minWidth: 250, fontWeight: 700 }}>Đánh giá học sinh</th>
              </tr>
            </thead>
            <tbody>
              {sessions.filter(sess => {
                if (!searchSyllabusQuery) return true;
                const q = searchSyllabusQuery.toLowerCase();
                const text = `${sess.week} ${sess.dayName} ${formatDisplayDate(sess.date)} ${sess.topic} ${sess.notes} ${sess.evaluation}`.toLowerCase();
                return text.includes(q);
              }).length > 0 ? sessions.filter(sess => {
                if (!searchSyllabusQuery) return true;
                const q = searchSyllabusQuery.toLowerCase();
                const text = `${sess.week} ${sess.dayName} ${formatDisplayDate(sess.date)} ${sess.topic} ${sess.notes} ${sess.evaluation}`.toLowerCase();
                return text.includes(q);
              }).map((sess, idx) => (
                <tr key={sess.id} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s', background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,102,255,0.03)'} onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'}>
                  <td style={{ padding: '16px', verticalAlign: 'top' }}>
                    <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                      {sess.dayName || `Ngày ${idx + 1}`}
                    </span>
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'top', fontWeight: 500, color: sess.date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {sess.date ? formatDisplayDate(sess.date) : 'Chưa xếp lịch'}
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'top', whiteSpace: 'pre-line' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--accent-blue)', fontSize: 15 }}>{sess.topic}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{sess.notes}</div>
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'top', whiteSpace: 'pre-line', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
                    {sess.evaluation || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Chưa có đánh giá</span>}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    {sessions.length === 0 ? 'Chưa có dữ liệu buổi học nào.' : 'Không tìm thấy kết quả phù hợp.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Mobile Card View for Syllabus */}
          <div className="mobile-only">
            {sessions.filter(sess => {
              if (!searchSyllabusQuery) return true;
              const q = searchSyllabusQuery.toLowerCase();
              const text = `${sess.week} ${sess.dayName} ${formatDisplayDate(sess.date)} ${sess.topic} ${sess.notes} ${sess.evaluation}`.toLowerCase();
              return text.includes(q);
            }).length > 0 ? sessions.filter(sess => {
              if (!searchSyllabusQuery) return true;
              const q = searchSyllabusQuery.toLowerCase();
              const text = `${sess.week} ${sess.dayName} ${formatDisplayDate(sess.date)} ${sess.topic} ${sess.notes} ${sess.evaluation}`.toLowerCase();
              return text.includes(q);
            }).map((sess, idx) => (
              <div key={sess.id} className="mobile-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ display: 'inline-block', padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>
                    {sess.dayName || `Ngày ${idx + 1}`}
                  </span>
                  <span style={{ fontWeight: 600, color: sess.date ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 13 }}>
                    {sess.date ? formatDisplayDate(sess.date) : 'Chưa xếp lịch'}
                  </span>
                </div>
                
                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent-blue)', fontSize: 16 }}>
                  {sess.topic || 'Chưa có chủ đề'}
                </div>
                
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 12, whiteSpace: 'pre-line' }}>
                  {sess.notes || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Chưa có nội dung chi tiết</span>}
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>Đánh giá / Nhận xét:</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {sess.evaluation || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Chưa có đánh giá</span>}
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                Không tìm thấy kết quả phù hợp.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Sửa Buổi Học */}
      {editingSession && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-fadeInUp" style={{ width: 600, maxWidth: '90%', padding: 32, maxHeight: '90vh', overflowY: 'auto', background: 'white' }}>
            <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border)', paddingBottom: 16, fontSize: 20 }}>
              Cập nhật Nội dung & Video
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Tên chủ đề / Nội dung bài học</label>
              <input type="text" className="input" value={editingSession.topic || ''} onChange={e => setEditingSession({...editingSession, topic: e.target.value})} placeholder="VD: Khái niệm cơ bản..." style={{ padding: '10px 14px' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Ngày học (YYYY-MM-DD)</label>
              <input type="date" className="input" value={editingSession.date || ''} onChange={e => setEditingSession({...editingSession, date: e.target.value})} style={{ padding: '10px 14px' }} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><PlayCircle size={16} style={{ marginRight: 6, color: 'var(--accent-blue)' }} /> Link Video E-Learning (YouTube / Google Drive)</label>
              <input type="text" className="input" value={editingSession.videoUrl || ''} onChange={e => setEditingSession({...editingSession, videoUrl: e.target.value})} placeholder="https://youtube.com/watch?v=..." style={{ padding: '10px 14px' }} />
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>* Học sinh vắng mặt hoặc học online có thể xem video này.</small>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><FileText size={16} style={{ marginRight: 6, color: 'var(--accent-purple)' }} /> Link Tài liệu đính kèm (Tùy chọn)</label>
              <input type="text" className="input" value={editingSession.materialUrl || ''} onChange={e => setEditingSession({...editingSession, materialUrl: e.target.value})} placeholder="Link Google Drive chứa file PDF/Word..." style={{ padding: '10px 14px' }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" onClick={() => setEditingSession(null)} style={{ padding: '8px 20px' }}>Hủy bỏ</button>
              <button className="btn btn-primary" onClick={saveEditedSession} disabled={saving} style={{ padding: '8px 20px' }}>
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Buổi Học */}
      {showAddSession && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-fadeInUp" style={{ width: 500, maxWidth: '90%', padding: 32, maxHeight: '90vh', overflowY: 'auto', background: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Thêm Buổi học Mới</h2>
              <button className="btn-icon" onClick={() => !saving && setShowAddSession(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={submitNewSession}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Ngày học (Dự kiến theo lịch)</label>
                <input type="date" required className="input" value={newSessionForm.date} onChange={e => setNewSessionForm({...newSessionForm, date: e.target.value})} style={{ padding: '10px 14px' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Tên chủ đề / Nội dung dự kiến (Tùy chọn)</label>
                <input type="text" className="input" value={newSessionForm.topic} onChange={e => setNewSessionForm({...newSessionForm, topic: e.target.value})} placeholder="VD: Khái niệm cơ bản..." style={{ padding: '10px 14px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                <button type="button" onClick={() => setShowAddSession(false)} className="btn btn-secondary" style={{ padding: '8px 24px' }}>Hủy</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '8px 24px' }}>
                  {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Tạo buổi học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
