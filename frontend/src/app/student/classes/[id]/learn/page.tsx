'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Lock, PlayCircle, FileText, Check, AlertCircle } from 'lucide-react';
import { classApi } from '@/lib/api';

export default function StudentClassLearnPage() {
  const { id: classId } = useParams() as { id: string };
  const router = useRouter();
  
  const [student, setStudent] = useState<any>(null);
  const [courseData, setCourseData] = useState<any>(null); // it's a class
  const [lessons, setLessons] = useState<any[]>([]); // sessions
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'details' | 'curriculum'>('curriculum');

  useEffect(() => {
    const userStr = localStorage.getItem('student_user');
    if (!userStr) {
      router.push('/student/login');
      return;
    }
    const user = JSON.parse(userStr);
    setStudent(user);
    fetchClassData(user.id);
  }, [classId]);

  const fetchClassData = async (studentId: string) => {
    setLoading(true);
    try {
      const [cRes, sessRes, pRes] = await Promise.all([
        classApi.getById(classId),
        classApi.getSessions(classId),
        classApi.getElearningProgress(classId, studentId)
      ]);
      
      setCourseData(cRes.data);
      // Sắp xếp các session theo thứ tự tạo hoặc id (hoặc order nếu có)
      const curriculum = sessRes.data || [];
      // Buổi học đã có date, ta sort theo date
      curriculum.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      setLessons(curriculum);
      setProgressData(pRes.data);
      
      // Select first lesson automatically
      if (curriculum.length > 0) {
        const progress = pRes.data.progress || [];
        const firstUnfinished = curriculum.find((l: any) => !progress.includes(l.id));
        setActiveLessonId(firstUnfinished ? firstUnfinished.id : curriculum[0].id);
      }

    } catch (err) {
      console.error(err);
      alert('Không thể tải dữ liệu lớp học');
      router.push('/student/dashboard');
    }
    setLoading(false);
  };

  const handleCompleteLesson = async () => {
    if (!activeLessonId || !progressData) return;
    const progress = [...(progressData.progress || [])];
    
    if (!progress.includes(activeLessonId)) {
      progress.push(activeLessonId);
      
      // Update state optimistically
      const newProgress = { ...progressData, progress };
      setProgressData(newProgress);
      
      try {
        await classApi.updateElearningProgress(classId, student.id, progress);
        
        // Auto select next lesson if available
        const currentIndex = lessons.findIndex(l => l.id === activeLessonId);
        if (currentIndex >= 0 && currentIndex < lessons.length - 1) {
          setActiveLessonId(lessons[currentIndex + 1].id);
        }
      } catch (e) {
        console.error('Failed to update progress', e);
      }
    }
  };

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    let videoId = '';
    if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : url;
  };

  if (loading || !courseData || !student) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><span className="spinner"></span></div>;
  }

  const progress = progressData?.progress || [];
  const percentComplete = lessons.length > 0 ? Math.round((progress.length / lessons.length) * 100) : 0;
  
  const activeLesson = lessons.find(l => l.id === activeLessonId);
  const isCompleted = activeLesson && progress.includes(activeLesson.id);

  return (
    <div className="learn-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .learn-body {
            flex-direction: column !important;
          }
          .learn-sidebar {
            display: none !important; /* Mặc định ẩn sidebar ở mobile, dùng tab để hiển thị */
          }
          .learn-main {
            flex: 1 !important;
          }
          .video-container {
            flex: none !important;
            aspect-ratio: 16/9;
            width: 100%;
            max-height: none !important;
            padding-top: 0 !important;
          }
          .lesson-details {
            padding: 16px !important;
          }
          .lesson-header {
            flex-direction: column;
            gap: 16px;
          }
          .lesson-btn {
            margin-left: 0 !important;
            width: 100%;
          }
          .lesson-title {
            font-size: 20px !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
          .mobile-tabs {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .mobile-tabs {
            display: none !important;
          }
        }
      `}} />

      {/* Top Navigation Bar */}
      <div style={{ height: 60, background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/student/dashboard')} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px' }}>
            <ArrowLeft size={16} /> <span className="hide-on-mobile" style={{ marginLeft: 6 }}>Quay lại</span>
          </button>
          <h2 style={{ fontSize: 16, margin: 0, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
            {courseData.className}
          </h2>
        </div>
        
        <div className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span>Tiến độ hoàn thành: <strong style={{ color: 'var(--accent-blue)' }}>{percentComplete}%</strong></span>
          <div style={{ width: 120, height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${percentComplete}%`, background: 'var(--accent-blue)', transition: 'width 0.3s ease' }}></div>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="learn-body" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Sidebar - Lộ trình (Desktop chỉ) */}
        <div className="learn-sidebar" style={{ width: 350, background: 'white', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
              <span>Tiến độ hoàn thành</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{percentComplete}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${percentComplete}%`, background: 'var(--accent-blue)', transition: 'width 0.3s ease' }}></div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {lessons.map((lesson, index) => {
              const isFinished = progress.includes(lesson.id);
              const isLocked = index > 0 && !progress.includes(lessons[index - 1].id);
              const isActive = activeLessonId === lesson.id;
              
              return (
                <div 
                  key={lesson.id} 
                  onClick={() => !isLocked && setActiveLessonId(lesson.id)}
                  style={{ 
                    display: 'flex', alignItems: 'center', padding: '12px 16px', margin: '4px 0',
                    borderRadius: 8, cursor: isLocked ? 'not-allowed' : 'pointer',
                    background: isActive ? 'var(--bg-hover)' : 'transparent',
                    border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                    opacity: isLocked ? 0.6 : 1
                  }}
                >
                  <div style={{ 
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0,
                    background: isFinished ? 'var(--accent-green)' : (isLocked ? 'var(--bg-secondary)' : 'var(--bg-secondary)'),
                    color: isFinished ? 'white' : 'var(--text-secondary)'
                  }}>
                    {isFinished ? <Check size={14} /> : (isLocked ? <Lock size={12} /> : <span style={{ fontSize: 12, fontWeight: 600 }}>{index + 1}</span>)}
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isLocked ? 'var(--text-muted)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Buổi {index + 1}: {lesson.topic || 'Chưa cập nhật nội dung'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {lesson.videoUrl && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><PlayCircle size={12} /> Có Video</span>}
                      {lesson.materialUrl && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={12} /> Tài liệu</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="learn-main" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'white' }}>
          
          {/* Mobile Tabs */}
          <div className="mobile-tabs" style={{ display: 'none', background: 'white', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button 
              onClick={() => setMobileTab('curriculum')}
              style={{ flex: 1, padding: '16px', background: 'transparent', border: 'none', borderBottom: mobileTab === 'curriculum' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: mobileTab === 'curriculum' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: 600 }}
            >
              Lộ trình học
            </button>
            <button 
              onClick={() => setMobileTab('details')}
              style={{ flex: 1, padding: '16px', background: 'transparent', border: 'none', borderBottom: mobileTab === 'details' ? '2px solid var(--accent-blue)' : '2px solid transparent', color: mobileTab === 'details' ? 'var(--accent-blue)' : 'var(--text-secondary)', fontWeight: 600 }}
            >
              Bài giảng
            </button>
          </div>
          {activeLesson ? (
            <div style={{ padding: '0', flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
              
              {/* === TAB BÀI GIẢNG === */}
              <div style={{ display: mobileTab === 'details' ? 'flex' : 'none', flexDirection: 'column', flex: 1 }}>
                
                {/* Video Player */}
                {activeLesson.videoUrl ? (
                  <div 
                    className="video-container"
                    onClick={() => setShowVideoModal(true)}
                    style={{ width: '100%', background: 'black', position: 'relative', flexShrink: 0, aspectRatio: '16/9', cursor: 'pointer', overflow: 'hidden' }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', background: 'rgba(0,0,0,0.5)' }}>
                      <PlayCircle size={64} style={{ color: 'var(--accent-blue)', background: 'white', borderRadius: '50%', padding: 4 }} />
                      <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>Nhấn để Phát Video Full Màn Hình</div>
                    </div>
                  </div>
                ) : (
                  <div className="video-container" style={{ width: '100%', aspectRatio: '16/9', background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <AlertCircle size={48} style={{ opacity: 0.3 }} />
                    <span>Buổi học này chưa có Video</span>
                  </div>
                )}

                {/* Lesson Details */}
                <div className="lesson-details" style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto', width: '100%', background: 'white', flex: 1 }}>
                  <div className="lesson-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <h1 className="lesson-title" style={{ fontSize: 24, margin: '0 0 12px' }}>{activeLesson.topic || 'Chưa cập nhật nội dung'}</h1>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        Ngày học: {new Date(activeLesson.date).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    
                    {/* Complete Button */}
                    <button 
                      onClick={handleCompleteLesson} 
                      disabled={isCompleted}
                      className={`btn ${isCompleted ? 'btn-secondary' : 'btn-primary'} lesson-btn`}
                      style={{ padding: '12px 24px', borderRadius: 24, flexShrink: 0, marginLeft: 24, 
                        background: isCompleted ? '#e2e8f0' : 'var(--accent-green)',
                        color: isCompleted ? 'var(--text-muted)' : 'white',
                        border: 'none',
                        fontWeight: 600
                      }}
                    >
                      <CheckCircle size={18} /> {isCompleted ? 'Đã hoàn thành' : 'Hoàn thành buổi học'}
                    </button>
                  </div>

                  {activeLesson.materialUrl && (
                    <div style={{ padding: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#166534' }}>
                        <FileText size={32} />
                        <div>
                          <h4 style={{ margin: '0 0 4px', fontSize: 16 }}>Tài liệu đính kèm</h4>
                          <div style={{ fontSize: 13, opacity: 0.8 }}>Tải xuống tài liệu của buổi học này</div>
                        </div>
                      </div>
                      <a href={activeLesson.materialUrl} target="_blank" rel="noopener noreferrer" className="btn lesson-btn" style={{ background: 'white', color: '#166534', border: '1px solid #bbf7d0', flexShrink: 0 }}>
                        Mở tài liệu
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* === TAB LỘ TRÌNH (Chỉ Mobile) === */}
              <div className="mobile-tabs" style={{ display: mobileTab === 'curriculum' ? 'block' : 'none', flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg-secondary)' }}>
                <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: 'var(--text-secondary)' }}>
                    <span>Tiến độ hoàn thành</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{percentComplete}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percentComplete}%`, background: 'var(--accent-blue)' }}></div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {lessons.map((lesson, index) => {
                    const isFinished = progress.includes(lesson.id);
                    const isLocked = index > 0 && !progress.includes(lessons[index - 1].id);
                    const isActive = activeLessonId === lesson.id;
                    
                    return (
                      <div 
                        key={lesson.id} 
                        onClick={() => {
                          if (!isLocked) {
                            setActiveLessonId(lesson.id);
                            setMobileTab('details'); // Chuyển sang xem bài giảng khi click
                          }
                        }}
                        style={{ 
                          display: 'flex', alignItems: 'center', padding: '16px',
                          borderRadius: 12, cursor: isLocked ? 'not-allowed' : 'pointer',
                          background: isActive ? 'white' : 'white',
                          border: isActive ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                          opacity: isLocked ? 0.6 : 1,
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                        }}
                      >
                        <div style={{ 
                          width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 16, flexShrink: 0,
                          background: isFinished ? 'var(--accent-green)' : (isLocked ? 'var(--bg-secondary)' : 'var(--bg-hover)'),
                          color: isFinished ? 'white' : 'var(--text-secondary)'
                        }}>
                          {isFinished ? <Check size={16} /> : (isLocked ? <Lock size={14} /> : <span style={{ fontSize: 14, fontWeight: 600 }}>{index + 1}</span>)}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: isActive ? 600 : 500, color: isLocked ? 'var(--text-muted)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {lesson.topic || 'Chưa cập nhật nội dung'}
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                            {lesson.videoUrl && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><PlayCircle size={14} /> Video</span>}
                            {lesson.materialUrl && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FileText size={14} /> Tài liệu</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Chọn một buổi học để bắt đầu
            </div>
          )}
        </div>
      </div>

      {/* Video Modal */}
      {showVideoModal && activeLesson?.videoUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'black', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.8)' }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>{activeLesson.topic}</div>
            <button 
              onClick={() => setShowVideoModal(false)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>&times;</span>
            </button>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <iframe 
              src={getYoutubeEmbedUrl(activeLesson.videoUrl)} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

    </div>
  );
}
