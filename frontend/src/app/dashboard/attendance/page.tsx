'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceApi, employeeApi } from '@/lib/api';
import { Calendar as CalIcon, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFirstDayOfMonthString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const formatTime = (timeStr: string) => {
  if (!timeStr) return '—';
  // Nếu backend trả về ISO datetime (ví dụ: 1899-12-30T08:53:58.000Z)
  // Lấy trực tiếp phần time tránh bị Date tự cộng 7 tiếng múi giờ
  if (timeStr.includes('T')) {
    const timePart = timeStr.split('T')[1];
    return timePart.slice(0, 8); // "08:53:58"
  }
  return timeStr;
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [startDate, setStartDate] = useState(getFirstDayOfMonthString());
  const [endDate, setEndDate] = useState(getLocalDateString());

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.getAttendanceLogs({ startDate, endDate });
      setLogs(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [startDate, endDate]);

  const isManagerOrAdmin = user?.role === 'Admin' || user?.role === 'Manager';

  // For employee stats
  const processedLogs = logs.map(l => {
    let workHours = l.workHours || 0;
    if (!l.workHours && l.timeIn && l.timeOut) {
      const [hIn, mIn] = l.timeIn.split(':').map(Number);
      const [hOut, mOut] = l.timeOut.split(':').map(Number);
      if (!isNaN(hIn) && !isNaN(hOut)) {
        workHours = (hOut + mOut / 60) - (hIn + mIn / 60);
        if (workHours < 0) workHours = 0;
      }
    }
    return { ...l, checkInTime: l.timeIn || l.checkInTime, checkOutTime: l.timeOut || l.checkOutTime, workHours };
  });

  const myLogs = processedLogs.filter(l => l.employeeId === user?.id);
  const totalDays = myLogs.length;
  const lateDays = myLogs.filter(l => l.status === 'Late').length;
  const totalHours = myLogs.reduce((acc, curr) => acc + (curr.workHours || 0), 0);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Present': return <span className="badge badge-green">Đúng giờ</span>;
      case 'Late': return <span className="badge badge-orange">Đi trễ</span>;
      case 'Absent': return <span className="badge badge-red">Vắng mặt</span>;
      default: return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="page-title">Quản lý Chấm công</h1>
          <p className="page-subtitle">Dữ liệu giờ giấc làm việc</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label">Từ ngày</label>
          <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Đến ngày</label>
          <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>

      {(!isManagerOrAdmin) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="stat-card">
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Số ngày đi làm</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={24} /> {totalDays}</p>
          </div>
          <div className="stat-card">
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Số ngày đi trễ</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={24} /> {lateDays}</p>
          </div>
          <div className="stat-card">
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>Tổng giờ làm</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={24} /> {totalHours.toFixed(1)}h</p>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ padding: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, display: 'inline-block' }} /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {isManagerOrAdmin && <th>Nhân viên</th>}
                  <th>Ngày</th>
                  <th>Giờ Check-in</th>
                  <th>Giờ Check-out</th>
                  <th>Số giờ làm</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(isManagerOrAdmin ? processedLogs : myLogs).map(log => (
                  <tr key={log.id}>
                    {isManagerOrAdmin && <td style={{ fontWeight: 600 }}>{log.employeeName || '—'}</td>}
                    <td>{new Date(log.date).toLocaleDateString('vi-VN')}</td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 14 }}>{formatTime(log.checkInTime)}</td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 14 }}>{formatTime(log.checkOutTime)}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{log.workHours ? `${log.workHours.toFixed(1)}h` : '—'}</td>
                    <td>{getStatusBadge(log.status)}</td>
                  </tr>
                ))}
                {(isManagerOrAdmin ? processedLogs : myLogs).length === 0 && (
                  <tr><td colSpan={isManagerOrAdmin ? 6 : 5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Không có dữ liệu chấm công.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
