'use client';
import { useState, useEffect } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { classApi } from '@/lib/api';
import { 
  ArrowLeft, Info, Users, BookOpen, Check, BarChart2, Loader2, GraduationCap, PieChart
} from 'lucide-react';

export default function ClassDetailLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const router = useRouter();
  
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    fetchClass();
  }, [id]);

  const tabs = [
    { name: 'Tổng quan & Học viên', path: `/dashboard/classes/${id}`, icon: <Info size={16} />, exact: true },
    { name: 'Lộ trình & Điểm danh', path: `/dashboard/classes/${id}/attendance`, icon: <Check size={16} /> },
    { name: 'Bài thi & Điểm số', path: `/dashboard/classes/${id}/tests`, icon: <BarChart2 size={16} /> },
    { name: 'Báo cáo Lớp', path: `/dashboard/classes/${id}/reports`, icon: <PieChart size={16} /> },
  ];

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}><Loader2 className="spinner" size={32} style={{ display: 'inline-block' }} /></div>;
  }

  if (!classData) {
    return (
      <div className="section">
        <div className="section-header">
          <button className="btn btn-secondary" onClick={() => router.push('/dashboard/classes')}><ArrowLeft size={16} /> Quay lại</button>
          <h1 className="page-title">Không tìm thấy lớp học</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="section animate-fadeInUp" style={{ paddingBottom: 0 }}>
      {/* Header dùng chung cho mọi sub-page của lớp */}
      <div className="section-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary" style={{ padding: '8px', borderRadius: '50%' }} onClick={() => router.push('/dashboard/classes')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge badge-blue">{classData.subjectType}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Giảng viên: <strong>{classData.instructorName || 'Chưa phân công'}</strong></span>
            </div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <GraduationCap color="var(--accent-blue)" /> {classData.className}
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const isActive = tab.exact ? pathname === tab.path : pathname.startsWith(tab.path);
          return (
            <Link 
              key={tab.path} 
              href={tab.path}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 4px',
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                borderBottom: `2px solid ${isActive ? 'var(--accent-blue)' : 'transparent'}`,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              className="hover-text-blue"
            >
              {tab.icon} {tab.name}
            </Link>
          );
        })}
      </div>

      {/* Nội dung sub-page sẽ render ở đây */}
      <div style={{ paddingBottom: 32 }}>
        {children}
      </div>
    </div>
  );
}
