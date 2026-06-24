'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, BookOpen, Clock, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import { classApi, studentAuthApi, initApi } from '@/lib/api';

export default function StudentDashboard() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const handleCheckIn = async (sessionId: string) => {
    if (!student) return;
    setCheckingIn(sessionId);
    try {
      await studentAuthApi.checkIn(sessionId);
      alert('Điểm danh thành công!');
      fetchMyData(student.id);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi điểm danh. Vui lòng thử lại.');
    }
    setCheckingIn(null);
  };

  useEffect(() => {
    // Kiểm tra đăng nhập
    const token = localStorage.getItem('student_token');
    const userStr = localStorage.getItem('student_user');
    
    if (!token || !userStr) {
      router.push('/student/login');
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      setStudent(user);
      fetchMyData(user);
    } catch (e) {
      router.push('/student/login');
    }
  }, []);

  const fetchMyData = async (studentObj: any) => {
    setLoading(true);
    try {
      const initRes = await initApi.getStudentDashboardData(studentObj.phone);
      const enrolledClasses = initRes.data.enrolledClasses || [];

      // Tính toán chuyên cần và điểm số từ dữ liệu trả về
      const classesWithAttendance = enrolledClasses.map((c: any) => {
        const sessions = c.sessions || [];
        const tests = c.tests || [];
        
        // Tính toán chuyên cần
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        
        sessions.forEach((s: any) => {
          const myAtt = s.attendance?.find((a: any) => a.studentId === studentObj.id);
          if (myAtt) {
            if (myAtt.status === 'Present') presentCount++;
            else if (myAtt.status === 'Absent') absentCount++;
            else if (myAtt.status === 'Late') lateCount++;
          }
        });
        
        // Lọc điểm của riêng học sinh này
        const myTests = tests.map((t: any) => {
          const myScore = t.scores?.find((s: any) => s.studentId === studentObj.id);
          return {
            ...t,
            myScore: myScore || null
          };
        });
        
        return {
          ...c,
          sessions,
          tests: myTests,
          attendanceStats: {
            total: sessions.length,
            present: presentCount,
            absent: absentCount,
            late: lateCount
          }
        };
      });
      
      setMyClasses(classesWithAttendance);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_user');
    router.push('/student/login');
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      return timeStr.split('T')[1].substring(0, 5);
    }
    return timeStr.substring(0, 5);
  };

  const getDayName = (dayIdx: string | number) => {
    const d = parseInt(dayIdx.toString());
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[d] || '';
  };

  if (loading || !student) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-secondary)' }}>
        <RefreshCw className="spinner" size={32} color="var(--accent-blue)" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid var(--border)', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-blue)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18 }}>
              {student.fullName?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{student.fullName}</h1>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{student.phone}</div>
            </div>
          </div>
          
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontSize: 24, margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <BookOpen size={24} color="var(--accent-blue)" /> 
          Lớp học của tôi
        </h2>

        {myClasses.length === 0 ? (
          <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: 16 }}>Bạn chưa được ghi danh vào lớp học nào.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 24 }}>
            {myClasses.map(c => (
              <div key={c.id} className="glass-card" style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 24 }}>
                {/* Thông tin lớp */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <span className="badge badge-blue">{c.subjectType || 'Môn học'}</span>
                    <span className="badge badge-purple">{c.status || 'Đang diễn ra'}</span>
                  </div>
                  <h3 style={{ fontSize: 20, margin: '0 0 8px' }}>{c.className}</h3>
                  <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)' }}>Giáo viên: <strong>{c.instructorName || 'Chưa gán'}</strong></p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14 }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    <span>Thời gian: {new Date(c.startDate).toLocaleDateString('vi-VN')} {c.endDate && `đến ${new Date(c.endDate).toLocaleDateString('vi-VN')}`}</span>
                  </div>
                  
                  {c.schedules && c.schedules.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
                      <Clock size={16} color="var(--text-muted)" style={{ marginTop: 2 }} />
                      <div>
                        {c.schedules.map((s: any, idx: number) => (
                          <div key={idx}>{getDayName(s.dayOfWeek)}: {formatTime(s.startTime)} - {formatTime(s.endTime)}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Thống kê điểm danh */}
                <div style={{ flex: '1 1 250px', background: 'var(--bg-secondary)', borderRadius: 16, padding: 20 }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Tình trạng chuyên cần</h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{c.attendanceStats.total}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tổng buổi học</div>
                    </div>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)' }}>{c.attendanceStats.present}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Có mặt</div>
                    </div>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-red)' }}>{c.attendanceStats.absent}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vắng mặt</div>
                    </div>
                    <div style={{ background: 'white', padding: 12, borderRadius: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-orange)' }}>{c.attendanceStats.late}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Đi trễ</div>
                    </div>
                  </div>
                  
                  {/* Thanh tiến độ */}
                  {c.attendanceStats.total > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span>Tỷ lệ có mặt</span>
                        <span style={{ fontWeight: 600 }}>{Math.round(c.attendanceStats.present / c.attendanceStats.total * 100)}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          background: 'var(--accent-green)', 
                          width: `${(c.attendanceStats.present / c.attendanceStats.total) * 100}%` 
                        }} />
                      </div>
                    </div>
                  )}
                  
                  {/* Khu vực Tự Điểm danh */}
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const todaySession = c.sessions?.find((s: any) => s.date === todayStr);
                    
                    if (todaySession) {
                      const myAtt = todaySession.attendance?.find((a: any) => a.studentId === student.id);
                      const isCheckedIn = myAtt && myAtt.status === 'Present';
                      
                      return (
                        <div style={{ marginTop: 20, padding: 16, background: isCheckedIn ? 'rgba(52, 199, 89, 0.1)' : 'rgba(0, 122, 255, 0.05)', borderRadius: 12, border: `1px solid ${isCheckedIn ? 'var(--accent-green)' : 'var(--accent-blue)'}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            {isCheckedIn ? <CheckCircle size={20} color="var(--accent-green)" /> : <Clock size={20} color="var(--accent-blue)" />}
                            <span style={{ fontWeight: 600, color: isCheckedIn ? 'var(--accent-green)' : 'var(--accent-blue)' }}>
                              Buổi học hôm nay: {todaySession.topic || 'Đang diễn ra'}
                            </span>
                          </div>
                          
                          {isCheckedIn ? (
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)' }}>Bạn đã điểm danh lúc {new Date(myAtt.checkInTime).toLocaleTimeString('vi-VN')}</p>
                          ) : (
                            <button 
                              onClick={() => handleCheckIn(todaySession.id)}
                              disabled={checkingIn === todaySession.id}
                              className="btn btn-primary" 
                              style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
                            >
                              {checkingIn === todaySession.id ? <RefreshCw className="spinner" size={18} /> : 'Điểm danh ngay'}
                            </button>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}

                </div>

                {/* Lịch sử điểm danh (Tất cả buổi học) */}
                {c.sessions && c.sessions.length > 0 && (
                  <div style={{ flex: '1 1 100%', marginTop: 8 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Lịch sử điểm danh</h4>
                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Ngày học</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Nội dung</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Giờ điểm danh</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.sessions.map((session: any, idx: number) => {
                            const att = session.attendance?.find((a: any) => a.studentId === student.id);
                            const statusLabel = att?.status === 'Present' ? 'Có mặt' :
                                              att?.status === 'Absent' ? 'Vắng mặt' :
                                              att?.status === 'Late' ? 'Đi trễ' :
                                              att?.status === 'Excused' ? 'Có phép' : 'Chưa điểm danh';
                            
                            const statusColor = att?.status === 'Present' ? 'var(--accent-green)' :
                                              att?.status === 'Absent' ? 'var(--accent-red)' :
                                              att?.status === 'Late' ? 'var(--accent-orange)' :
                                              att?.status === 'Excused' ? 'var(--accent-purple)' : 'var(--text-muted)';
                                              
                            return (
                              <tr key={session.id} style={{ borderBottom: idx < c.sessions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <td style={{ padding: '12px 16px' }}>{new Date(session.date).toLocaleDateString('vi-VN')}</td>
                                <td style={{ padding: '12px 16px' }}>{session.topic || '---'}</td>
                                <td style={{ padding: '12px 16px' }}>{att?.checkInTime ? new Date(att.checkInTime).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'}) : '---'}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: statusColor }}>{statusLabel}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Kết quả học tập (Bài kiểm tra) */}
                {c.tests && c.tests.length > 0 && (
                  <div style={{ flex: '1 1 100%', marginTop: 16 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BarChart2 size={18} color="var(--accent-blue)" /> Kết quả học tập
                    </h4>
                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Ngày kiểm tra</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Tên bài kiểm tra</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Điểm số</th>
                            <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>Nhận xét của giáo viên</th>
                          </tr>
                        </thead>
                        <tbody>
                          {c.tests.map((test: any, idx: number) => {
                            const score = test.myScore?.score;
                            const feedback = test.myScore?.feedback;
                            const isGraded = score !== undefined && score !== null && score !== '';
                            
                            return (
                              <tr key={test.id} style={{ borderBottom: idx < c.tests.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                <td style={{ padding: '12px 16px' }}>{new Date(test.date).toLocaleDateString('vi-VN')}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{test.title}</td>
                                <td style={{ padding: '12px 16px' }}>
                                  {isGraded ? (
                                    <span style={{ 
                                      display: 'inline-block', 
                                      padding: '4px 12px', 
                                      borderRadius: 20, 
                                      background: Number(score) >= 8 ? 'var(--accent-green)' : (Number(score) >= 5 ? 'var(--accent-blue)' : 'var(--accent-red)'),
                                      color: 'white',
                                      fontWeight: 700
                                    }}>
                                      {score}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa có điểm</span>
                                  )}
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                                  {feedback || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>---</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
