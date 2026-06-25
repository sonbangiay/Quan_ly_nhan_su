'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { classApi } from '@/lib/api';
import { AlertTriangle, TrendingDown, Clock, UserX, Mail, Phone } from 'lucide-react';

export default function ClassReportsPage() {
  const { id } = useParams() as { id: string };
  
  const [classData, setClassData] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, tRes, sRes] = await Promise.all([
          classApi.getById(id),
          classApi.getTests(id),
          classApi.getSessions(id)
        ]);
        setClassData(cRes.data);
        setTests(tRes.data || []);
        setSessions(sRes.data || []);
      } catch(e) {
        console.error(e);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><span className="spinner"></span> Đang tải dữ liệu báo cáo...</div>;
  }

  const students = classData?.students || [];

  // Tính toán dữ liệu báo cáo
  const reportData = students.map((st: any) => {
    let absent = 0;
    let late = 0;
    sessions.forEach(sess => {
      const attArray = Array.isArray(sess.attendance) ? sess.attendance : Object.values(sess.attendance || {});
      const att = attArray.find((a:any) => a.studentId === st.id);
      if (att) {
        if (att.status === 'Absent' || att.status === 'AbsentExcused') absent++;
        if (att.status === 'Late') late++;
      }
    });

    const testScores: Record<string, number | null> = {};
    let testSum = 0;
    let testCount = 0;
    let lowTestCount = 0;
    
    tests.forEach(test => {
      const scoreObj = test.scores?.find((s:any) => s.studentId === st.id);
      if (scoreObj && scoreObj.score !== undefined && scoreObj.score !== null && scoreObj.score !== '') {
        const s = Number(scoreObj.score);
        testScores[test.id] = s;
        testSum += s;
        testCount++;
        if (s < 5) lowTestCount++;
      } else {
        testScores[test.id] = null;
      }
    });
    
    const avgScore = testCount > 0 ? (testSum / testCount).toFixed(1) : null;

    // Cảnh báo
    const isAbsentAlert = absent >= 3;
    const isLowAvgAlert = avgScore !== null && Number(avgScore) < 5;
    const isLowTestAlert = lowTestCount > 0;
    
    return {
      ...st,
      absent,
      late,
      totalSessions: sessions.length,
      testScores,
      avgScore,
      isAbsentAlert,
      isLowAvgAlert,
      isLowTestAlert,
      needsAttention: isAbsentAlert || isLowAvgAlert || isLowTestAlert
    };
  });

  const alerts = reportData.filter((r: any) => r.needsAttention);

  return (
    <div className="animate-fadeInUp" style={{ padding: '0 24px' }}>
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        
        {/* Cảnh báo học tập */}
        <div className="glass-card" style={{ flex: 1, padding: 24, border: '1px solid var(--danger-light)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
            <AlertTriangle size={20} /> Cảnh báo học tập ({alerts.length})
          </h3>
          
          {alerts.length === 0 ? (
            <div style={{ color: 'var(--success)', fontWeight: 600, padding: '16px 0' }}>Tuyệt vời! Không có học viên nào trong diện cần cảnh báo.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map((al: any) => (
                <div key={al.id} style={{ background: '#fff', border: '1px solid var(--danger-light)', borderRadius: 8, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{al.fullName}</h4>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                      {al.isAbsentAlert && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><UserX size={14} /> Vắng {al.absent} buổi</span>}
                      {al.isLowAvgAlert && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}><TrendingDown size={14} /> Điểm TB: {al.avgScore}</span>}
                      {al.isLowTestAlert && !al.isLowAvgAlert && <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={14} /> Có bài thi {'<'} 5đ</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" title="Gọi điện" onClick={() => alert('Đang chuyển hướng cuộc gọi: ' + al.phone)}><Phone size={14} /></button>
                    <button className="btn btn-secondary btn-sm" title="Gửi Zalo/Email" onClick={() => alert('Đang mở màn hình gửi thông báo cho: ' + al.fullName)}><Mail size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thống kê nhanh */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>TỔNG SỐ BÀI KIỂM TRA</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-blue)' }}>{tests.length}</div>
          </div>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>TỔNG SỐ BUỔI ĐIỂM DANH</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-green)' }}>{sessions.length}</div>
          </div>
        </div>

      </div>

      {/* Sổ điểm tổng hợp */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 40 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingDown size={20} color="var(--accent-blue)" style={{ transform: 'rotate(180deg)' }} /> Sổ điểm điện tử (Master Gradebook)
        </h3>
        
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', minWidth: 200, position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 2 }}>Họ và tên</th>
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', minWidth: 100 }}>Vắng mặt</th>
                
                {tests.map(t => (
                  <th key={t.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', minWidth: 120 }}>
                    {t.title}
                  </th>
                ))}
                
                <th style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', textAlign: 'center', minWidth: 120, background: 'var(--bg-hover)' }}>Điểm TB</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((st: any, idx: number) => (
                <tr key={st.id} style={{ borderBottom: idx < reportData.length - 1 ? '1px solid var(--border)' : 'none', background: st.needsAttention ? 'var(--danger-light)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, position: 'sticky', left: 0, background: st.needsAttention ? '#fff5f5' : '#fff', zIndex: 1, borderRight: '1px solid var(--border)' }}>
                    {st.fullName}
                  </td>
                  
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {st.absent > 0 ? (
                      <span style={{ color: st.absent >= 3 ? 'var(--danger)' : 'var(--warning)', fontWeight: 700 }}>{st.absent} buổi</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                  
                  {tests.map(t => {
                    const score = st.testScores[t.id];
                    return (
                      <td key={t.id} style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {score !== null ? (
                          <span style={{ color: score < 5 ? 'var(--danger)' : 'inherit', fontWeight: score < 5 ? 700 : 500 }}>
                            {score}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                  
                  <td style={{ padding: '12px 16px', textAlign: 'center', background: 'var(--bg-hover)', fontWeight: 700 }}>
                    {st.avgScore !== null ? (
                      <span style={{ color: Number(st.avgScore) < 5 ? 'var(--danger)' : (Number(st.avgScore) >= 8 ? 'var(--success)' : 'var(--accent-blue)') }}>
                        {st.avgScore}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
