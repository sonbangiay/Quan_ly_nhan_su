'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardApi, aiApi, initApi } from '@/lib/api';
import { Users, Clock, TrendingUp, AlertCircle, CheckCircle, BarChart2, Target, UserCheck, Bot, Trophy, DollarSign, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

interface KpiItem { targetName: string; targetValue: number; currentValue: number; unit: string; progress: number; }
interface SummaryData {
  role: string;
  totalEmployees?: number; checkedInToday?: number; attendanceRate?: number;
  newLeadsThisWeek?: number; pendingLeaveRequests?: number; avgKpiProgress?: number;
  departmentStats?: { name: string; count: number }[];
  deptEmployees?: number; deptCheckedIn?: number; departmentName?: string; pendingLeave?: number;
  checkedIn?: boolean; checkedOut?: boolean; workHoursToday?: number; myLeads?: number;
  myPendingLeave?: number; myKpis?: KpiItem[];
}

const COLORS = ['#4f8ef7', '#a855f7', '#22c55e', '#f97316', '#06b6d4'];

function StatCard({ icon: Icon, label, value, color, sub }: { icon: React.ElementType; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="stat-card animate-fadeInUp">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0 }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</p>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </div>
  );
}

function KpiProgressCard({ kpi }: { kpi: KpiItem }) {
  const pct = Math.min(kpi.progress, 100);
  const color = pct >= 100 ? 'var(--accent-green)' : pct >= 70 ? 'var(--accent-blue)' : pct >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{kpi.targetName}</span>
        <span style={{ fontSize: 13, color, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{kpi.currentValue.toLocaleString()} {kpi.unit}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ {kpi.targetValue.toLocaleString()} {kpi.unit}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [kpiChart, setKpiChart] = useState<{ employee: string; targets: KpiItem[] }[]>([]);
  const [leadFunnel, setLeadFunnel] = useState<{ status: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiBrief, setAiBrief] = useState<string>('');
  
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [dailyActivities, setDailyActivities] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const initPromise = initApi.getDashboardData();
        const leaderPromise = (user?.role === 'Admin' || user?.role === 'Manager') ? dashboardApi.getLeaderboard() : Promise.resolve(null);
        const aiPromise = aiApi.getDailyBrief();
        
        const [initRes, leaderRes, aiRes] = await Promise.allSettled([
          initPromise,
          leaderPromise,
          aiPromise
        ]);

        if (initRes.status === 'fulfilled') {
          const data = initRes.value.data;
          setSummary(data.summary);
          setKpiChart(data.kpiChart);
          setLeadFunnel(data.leadFunnel);
          setForecast(data.revenueForecast);
          setDailyActivities(data.dailyActivities);
        }

        if (leaderRes.status === 'fulfilled' && leaderRes.value) {
          setLeaderboard(leaderRes.value.data);
        }

        if (aiRes.status === 'fulfilled') {
          setAiBrief(aiRes.value.data.message);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="section">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="page-title">
          Xin chào, {user?.fullName?.split(' ').slice(-1)[0]}! 👋
        </h1>
        <p className="page-subtitle">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* AI Assistant Banner */}
      {!loading && aiBrief && (
        <div className="glass-card animate-fadeInUp" style={{ padding: 20, marginBottom: 28, background: 'linear-gradient(to right, rgba(168, 85, 247, 0.1), rgba(6, 182, 212, 0.1))', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--accent-purple)', padding: 8, borderRadius: 12, color: 'white' }}><Bot size={20} /></div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--accent-purple)' }}>Trợ lý AI Nhân Phú</h3>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {aiBrief}
          </div>
        </div>
      )}

      {/* ADMIN DASHBOARD */}
      {user?.role === 'Admin' && summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard icon={Users} label="Tổng nhân sự" value={summary.totalEmployees ?? 0} color="var(--accent-blue)" sub="đang hoạt động" />
            <StatCard icon={Clock} label="Đến làm hôm nay" value={`${summary.checkedInToday ?? 0}`} color="var(--accent-green)" sub={`Tỷ lệ: ${summary.attendanceRate ?? 0}%`} />
            <StatCard icon={UserCheck} label="Leads mới 7 ngày" value={summary.newLeadsThisWeek ?? 0} color="var(--accent-cyan)" sub="khách hàng tiềm năng" />
            <StatCard icon={AlertCircle} label="Đơn nghỉ chờ duyệt" value={summary.pendingLeaveRequests ?? 0} color="var(--accent-orange)" sub="cần xử lý" />
            <StatCard icon={TrendingUp} label="KPI trung bình" value={`${summary.avgKpiProgress ?? 0}%`} color="var(--accent-purple)" sub="tiến độ hoàn thành" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            {/* Department chart */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Nhân sự theo Phòng ban</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.departmentStats?.map(d => ({ name: d.name.replace('Phòng ', ''), value: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Lead funnel */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>Phễu CRM (Tỷ lệ chuyển đổi)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {leadFunnel.map((item, idx) => {
                  const maxCount = Math.max(...leadFunnel.map(f => f.count), 1);
                  const widthPct = Math.max(Math.min((item.count / maxCount) * 100, 100), 15);
                  
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: `${widthPct}%`, background: COLORS[idx % COLORS.length], padding: '10px 0', borderRadius: 4, color: 'white', textAlign: 'center', fontWeight: 600, fontSize: 13, minWidth: 150, transition: 'width 0.5s ease-in-out', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                        {item.status}: <span style={{ fontSize: 15 }}>{item.count}</span>
                      </div>
                      {idx < leadFunnel.length - 1 && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0', display: 'flex', alignItems: 'center', fontWeight: 500, background: 'var(--bg-secondary)', padding: '2px 10px', borderRadius: 12 }}>
                          ↓ Chuyển đổi: <span style={{ color: 'var(--accent-orange)', marginLeft: 4, fontWeight: 700 }}>{leadFunnel[idx+1] ? (leadFunnel[idx]?.count > 0 ? ((leadFunnel[idx+1].count / leadFunnel[idx].count)*100).toFixed(1) : 0) : 0}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {leadFunnel.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu phễu</div>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
            {/* Gamification Leaderboard */}
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Trophy size={20} color="var(--accent-orange)" />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Top Nhân viên Chốt Sales</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {leaderboard.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Chưa có dữ liệu</div> : null}
                {leaderboard.map((item, idx) => (
                  <div key={item.employeeId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: idx === 0 ? 'var(--accent-orange)' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'var(--bg-hover)', color: idx <= 2 ? '#fff' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                        {idx + 1}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{item.employeeName}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{(item.totalRevenue).toLocaleString()}đ</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.contracts} hợp đồng</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Forecast BI */}
            {forecast && (
            <div className="glass-card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <DollarSign size={20} color="var(--accent-green)" />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Báo cáo BI: Dự báo Doanh thu</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, borderLeft: '4px solid var(--accent-green)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Doanh thu đã chốt (Thực tế)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-green)' }}>{forecast.actualRevenue.toLocaleString()}đ</div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, borderLeft: '4px solid var(--accent-blue)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Dự báo tăng thêm (Từ nhóm đang tư vấn)</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-blue)' }}>+ {forecast.forecastedExtraRevenue.toLocaleString()}đ</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>(Ước tính tỷ lệ chốt 30%)</div>
                </div>

                <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 12, borderLeft: '4px solid var(--accent-purple)' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Tổng quy mô Pipeline (Kỳ vọng)</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-purple)' }}>{forecast.totalExpected.toLocaleString()}đ</div>
                </div>
              </div>
            </div>
            )}
          </div>
        </>
      )}

      {/* MANAGER DASHBOARD */}
      {user?.role === 'Manager' && summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard icon={Users} label={`Nhân viên ${summary.departmentName}`} value={summary.deptEmployees ?? 0} color="var(--accent-blue)" />
            <StatCard icon={Clock} label="Đến làm hôm nay" value={`${summary.deptCheckedIn ?? 0}/${summary.deptEmployees ?? 0}`} color="var(--accent-green)" sub={`Tỷ lệ: ${summary.attendanceRate ?? 0}%`} />
            <StatCard icon={AlertCircle} label="Đơn nghỉ chờ duyệt" value={summary.pendingLeave ?? 0} color="var(--accent-orange)" />
          </div>
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Chào mừng trở lại, {user.fullName}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Hãy kiểm tra tiến độ kế hoạch và duyệt đơn của nhân viên phòng bạn hôm nay.</p>
          </div>
        </>
      )}

      {/* EMPLOYEE DASHBOARD */}
      {user?.role === 'Employee' && summary && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <StatCard icon={Clock} label="Giờ làm hôm nay" value={`${(summary.workHoursToday ?? 0).toFixed(1)}h`} color="var(--accent-blue)" sub={summary.checkedIn ? (summary.checkedOut ? 'Đã kết thúc' : 'Đang làm việc') : 'Chưa check-in'} />
            <StatCard icon={UserCheck} label="Khách hàng của tôi" value={summary.myLeads ?? 0} color="var(--accent-cyan)" />
            <StatCard icon={AlertCircle} label="Đơn nghỉ chờ duyệt" value={summary.myPendingLeave ?? 0} color="var(--accent-orange)" />
          </div>

          {summary.myKpis && summary.myKpis.length > 0 && (
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Target size={18} color="var(--accent-blue)" />
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>KPI của tôi (đang thực hiện)</h3>
              </div>
              {summary.myKpis.map((kpi, i) => <KpiProgressCard key={i} kpi={kpi} />)}
            </div>
          )}

          {(!summary.myKpis || summary.myKpis.length === 0) && (
            <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
              <BarChart2 size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Chưa có KPI nào đang thực hiện.</p>
            </div>
          )}
        </>
      )}

      {/* DAILY ACTIVITIES (VISIBLE TO ALL) */}
      <div className="glass-card animate-fadeInUp" style={{ padding: 20, marginTop: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ background: 'var(--accent-blue)', padding: 6, borderRadius: 8, color: 'white' }}>
            <Activity size={18} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Tiến độ & Hoạt động Hôm nay</h3>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                <th style={{ padding: '12px 16px' }}>Nhân viên</th>
                <th style={{ padding: '12px 16px' }}>Giờ Check-in</th>
                <th style={{ padding: '12px 16px' }}>Tổng khách hàng</th>
                <th style={{ padding: '12px 16px' }}>Hoạt động gần nhất hôm nay</th>
              </tr>
            </thead>
            <tbody>
              {dailyActivities.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
              ) : dailyActivities.map(act => (
                <tr key={act.employeeId} style={{ borderBottom: '1px solid var(--border)', fontSize: 14 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                        {act.avatar}
                      </div>
                      <span style={{ fontWeight: 600 }}>{act.employeeName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: act.checkInTime ? 'var(--text-primary)' : 'var(--accent-red)', fontWeight: act.checkInTime ? 400 : 500 }}>
                    {act.checkInTime ? new Date(act.checkInTime).toLocaleTimeString('vi-VN') : 'Chưa check-in'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'var(--bg-hover)', padding: '4px 10px', borderRadius: 12, fontWeight: 600, fontSize: 13 }}>
                      {act.activeLeads} khách
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                    {act.latestActivity ? (
                      <div>
                        <div style={{ color: 'var(--text-primary)', marginBottom: 4 }}>
                          <strong style={{ color: 'var(--accent-blue)' }}>{act.latestActivity.leadName}</strong>: {act.latestActivity.content}
                        </div>
                        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} /> {new Date(act.latestActivity.time).toLocaleTimeString('vi-VN')}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Chưa có hoạt động</span>
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
