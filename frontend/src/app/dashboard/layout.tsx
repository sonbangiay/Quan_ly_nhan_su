'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { attendanceApi, notificationApi, crmApi } from '@/lib/api';
import {
  LayoutDashboard, Users, Building2, Briefcase, ClipboardList,
  FileText, BarChart3, Clock, Calendar, Bell, LogOut,
  ChevronLeft, ChevronRight, UserCheck, ShieldCheck, Activity,
  TrendingUp, Menu, X, BookOpen, Star, Link as LinkIcon, GraduationCap,
  Sun, Moon, Palette, MessageSquare
} from 'lucide-react';

const SIDEBAR_ITEMS = [
  { href: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, roles: ['Admin', 'Manager', 'Employee'] },
  { href: '/dashboard/employees', label: 'Nhân viên', icon: Users, roles: ['Admin', 'Manager'] },
  { href: '/dashboard/departments', label: 'Phòng ban', icon: Building2, roles: ['Admin'] },
  { href: '/dashboard/positions', label: 'Chức vụ', icon: Briefcase, roles: ['Admin'] },
  { href: '/dashboard/workplan', label: 'Kế hoạch tuần', icon: ClipboardList, roles: ['Admin', 'Manager', 'Employee'] },
  { href: '/dashboard/messages', label: 'Đa kênh', icon: MessageSquare, roles: ['Admin', 'Manager', 'Employee'] },
  { href: '/dashboard/reports', label: 'Báo cáo', icon: FileText, roles: ['Admin', 'Manager', 'Employee'] },
  { href: '/dashboard/crm', label: 'CRM Khách hàng', icon: UserCheck, roles: ['Admin', 'Manager', 'Employee'] },
  { href: '/dashboard/kpi', label: 'KPI', icon: TrendingUp, roles: ['Admin', 'Manager', 'Employee'] },
  { href: '/dashboard/attendance', label: 'Chấm công', icon: Clock, roles: ['Admin', 'Manager', 'Employee', 'Instructor'] },
  { href: '/dashboard/leave', label: 'Nghỉ phép', icon: Calendar, roles: ['Admin', 'Manager', 'Employee', 'Instructor'] },
  { href: '/dashboard/classes', label: 'Quản lý Đào tạo', icon: GraduationCap, roles: ['Admin', 'Manager', 'Instructor'] },
  { href: '/dashboard/knowledge', label: 'Kho tài liệu', icon: BookOpen, roles: ['Admin', 'Manager', 'Employee', 'Instructor'] },
  { href: '/dashboard/integrations', label: 'Tích hợp & API', icon: LinkIcon, roles: ['Admin'] },
  { href: '/dashboard/notifications', label: 'Thông báo', icon: Bell, roles: ['Admin', 'Manager', 'Employee', 'Instructor'] },
  { href: '/dashboard/auditlog', label: 'Nhật ký HĐ', icon: Activity, roles: ['Admin'] },
];

function CheckInWidget() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{ id?: string; checkedIn?: boolean; checkedOut?: boolean; log?: { checkInTime?: string; workHours?: number }; timeIn?: string; timeOut?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (user?.id) {
      attendanceApi.getTodayStatus(user.id).then(r => setStatus(r.data)).catch(() => {});
    }
  }, [user?.id]);

  const handleCheckIn = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await attendanceApi.checkIn({ employeeId: user.id, employeeName: user.fullName });
      const r = await attendanceApi.getTodayStatus(user.id);
      setStatus(r.data);
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi check-in');
    }
    setLoading(false);
  };

  const handleCheckOut = async () => {
    if (!user || !status?.id) return;
    setLoading(true);
    try {
      await attendanceApi.checkOut(status.id, {});
      const r = await attendanceApi.getTodayStatus(user.id);
      setStatus(r.data);
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Lỗi check-out');
    }
    setLoading(false);
  };

  const localTime = new Date(time.getTime() + 0); // already local
  const hms = localTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px',
      background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-blue)', fontVariantNumeric: 'tabular-nums' }}>
          {hms}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {status?.timeIn ? (status.timeOut ? `✅ Đã về` : `🟢 Đã vào lúc ${status.timeIn}`) : '⭕ Chưa vào'}
        </div>
      </div>
      {!status?.timeIn ? (
        <button className="btn btn-success btn-sm" onClick={handleCheckIn} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Check-in'}
        </button>
      ) : !status?.timeOut ? (
        <button className="btn btn-danger btn-sm" onClick={handleCheckOut} disabled={loading}>
          {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : 'Check-out'}
        </button>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--accent-green)' }}>Đã về ✓</span>
      )}
    </div>
  );
}

function HeaderTicker() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchMeetings = async () => {
      try {
        const res = await crmApi.getLeads();
        const leadList = res.data || [];
        
        // Chỉ hiển thị cuộc hẹn chưa đến (appointmentTime >= hiện tại)
        // Khi đã hết giờ hẹn → tự biến mất khỏi ticker
        const now = Date.now();
        const activeMeetings = leadList
          .filter((l: any) => {
            if (l.status !== 'Meeting' || !l.appointmentTime) return false;
            const appTime = new Date(l.appointmentTime).getTime();
            return !isNaN(appTime) && appTime >= now;
          })
          .sort((a: any, b: any) =>
            new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime()
          );
          
        setMeetings(activeMeetings);
      } catch (err) {
        console.error('Lỗi khi lấy lịch hẹn:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
    
    // Tải lại sau mỗi 2 phút
    const interval = setInterval(fetchMeetings, 60000); // Làm mới mỗi 1 phút để phát hiện cuộc hẹn hết giờ
    return () => clearInterval(interval);
  }, [user]);

  // Tự động chuyển đổi sau mỗi 5 giây nếu có nhiều cuộc hẹn
  useEffect(() => {
    if (meetings.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % meetings.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [meetings]);

  const formatMeetingText = (lead: any) => {
    try {
      const isoString = lead.appointmentTime;
      // Đọc trực tiếp từ chuỗi để tránh lỗi múi giờ
      if (isoString && isoString.includes('T')) {
        const [dateStr, timeStr] = isoString.split('T');
        const [, month, day] = dateStr.split('-');
        const timePart = timeStr.substring(0, 5); // HH:mm
        if (day && month && timePart) {
          return `Hẹn gặp ${lead.name} lúc ${timePart} ${day}/${month}`;
        }
      }
      // Fallback
      const d = new Date(isoString);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `Hẹn gặp ${lead.name} lúc ${hours}:${minutes} ${day}/${month}`;
    } catch {
      return `Hẹn gặp ${lead.name}`;
    }
  };


  if (loading) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} /> Đang tải lịch hẹn...
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="header-ticker-green">
        <span>🌟</span> Chúc bạn một ngày làm việc hiệu quả!
      </div>
    );
  }

  const currentLead = meetings[currentIndex];

  return (
    <div 
      className="header-ticker"
      title="Click để mở CRM quản lý khách hàng"
      onClick={() => window.location.href = '/dashboard/crm'}
    >
      <span style={{ animation: 'pulse 2s infinite', display: 'inline-block' }}>📅</span>
      <span style={{ animation: 'slideIn 0.5s ease', display: 'inline-block' }} key={currentIndex}>
        {formatMeetingText(currentLead)}
      </span>
      {meetings.length > 1 && (
        <span style={{ fontSize: 9, background: 'var(--accent-purple)', color: 'white', padding: '1px 5px', borderRadius: 10, marginLeft: 4, fontWeight: 700 }}>
          {currentIndex + 1}/{meetings.length}
        </span>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    notificationApi.getNotifications()
      .then(r => setUnreadCount(r.data.filter((n: { isRead: boolean }) => !n.isRead).length))
      .catch(() => {});
  }, []);

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div>
          <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Đang tải...</p>
        </div>
      </div>
    );
  }

  const visibleItems = SIDEBAR_ITEMS.filter(item => {
    if (item.href === '/dashboard/classes') {
      return item.roles.includes(user.role) || user.departmentId === 'dept-giaovien';
    }
    return item.roles.includes(user.role);
  });
  const sidebarWidth = collapsed ? 72 : 256;

  const roleColors = { Admin: 'var(--accent-purple)', Manager: 'var(--accent-blue)', Employee: 'var(--accent-green)', Instructor: 'var(--accent-orange)' };
  const roleColor = roleColors[user.role as keyof typeof roleColors] || 'var(--text-secondary)';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 39 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth, minHeight: '100vh', background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)', position: 'fixed', left: 0, top: 0, zIndex: 40,
        display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease',
        overflow: 'hidden',
        transform: mobileOpen ? 'translateX(0)' : undefined,
      }} className={`sidebar${mobileOpen ? ' open' : ''}`}>

        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: 'var(--gradient-main)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 4px 12px rgba(79,142,247,0.3)'
          }}>
            <ShieldCheck size={20} color="white" />
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>Nhân Phú HRM</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Du học Nhân Phú</div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                  margin: '2px 8px', borderRadius: 8, textDecoration: 'none',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(79,142,247,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(79,142,247,0.2)' : '1px solid transparent',
                  transition: 'all 0.15s ease', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px' }}>
          {!collapsed && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `${roleColor}22`, border: `2px solid ${roleColor}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: roleColor
              }}>
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: 11, color: roleColor, fontWeight: 600 }}>{user.role}</div>
              </div>
            </div>
          )}
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 13, fontWeight: 500
          }}>
            <LogOut size={16} />
            {!collapsed && 'Đăng xuất'}
          </button>
        </div>

        {/* Collapse toggle (desktop) */}
        <button onClick={() => setCollapsed(!collapsed)}
          style={{
            position: 'absolute', top: 24, right: -14, width: 28, height: 28,
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            color: 'var(--text-muted)'
          }}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Main */}
      <div 
        className="main-content" 
        style={{ 
          '--sidebar-width': collapsed ? '72px' : '256px',
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column' 
        } as React.CSSProperties}
      >
        {/* Top Header */}
        <header style={{
          background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', position: 'sticky', top: 0, zIndex: 30
        }}>
          {/* Left section: mobile button */}
          <div style={{ display: 'flex', alignItems: 'center', minWidth: 40 }}>
            <button onClick={() => setMobileOpen(!mobileOpen)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
              className="md:hidden">
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Middle section: Header Ticker (Centered & Responsive) */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0 8px', overflow: 'hidden' }}>
            <HeaderTicker />
          </div>

          {/* Right section: User info & widgets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 40, justifyContent: 'flex-end' }}>
            <CheckInWidget />

            <Link href="/dashboard/notifications" style={{ position: 'relative', color: 'var(--text-secondary)' }}>
              <Bell size={22} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -6, right: -6, background: 'var(--accent-red)',
                  color: 'white', fontSize: 10, fontWeight: 700, width: 18, height: 18,
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg-secondary)'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
