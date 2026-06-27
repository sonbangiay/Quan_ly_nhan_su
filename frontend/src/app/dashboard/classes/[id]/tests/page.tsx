'use client';
import { useState, useEffect, use } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { classApi } from '@/lib/api';
import { ArrowLeft, Check, X, Clock, Calendar, Save, Plus, BarChart2, Edit2, Trash2, Settings, List, FileText, CheckCircle, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const router = useRouter();
  const resolvedParams = use(params);
  const classId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [scoresData, setScoresData] = useState<Record<string, {score: string, feedback: string}>>({});
  
  // Tabs: 'scores' | 'online_builder'
  const [activeTab, setActiveTab] = useState<'scores' | 'online_builder'>('scores');

  useEffect(() => {
    fetchClassData();
  }, [classId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const res = await classApi.getById(classId).catch(() => ({ data: null }));
      let cData = res?.data;
      
      if (!cData || typeof cData !== 'object' || !cData.id || cData.error) {
        const allRes = await classApi.getAll().catch(() => ({ data: [] }));
        let allClasses = Array.isArray(allRes?.data) ? allRes.data : (allRes?.data?.data || []);
        cData = allClasses.find((c: any) => String(c.id).trim() === String(decodeURIComponent(classId)).trim());
        
        if (!cData) {
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

      const testRes = await classApi.getTests(classId).catch(() => ({ data: [] }));
      let testData = testRes?.data || [];
      setTests(testData);
      
      if (testData.length > 0) {
        if (!selectedTestId || !testData.find((t: any) => t.id === selectedTestId)) {
          setSelectedTestId(testData[0].id);
          loadScoresFromTest(testData[0].id, testData, studentsList);
        } else {
          loadScoresFromTest(selectedTestId, testData, studentsList);
        }
      } else {
        const emptyScores: Record<string, any> = {};
        studentsList.forEach((s: any) => { emptyScores[s.id] = { score: '', feedback: '' }; });
        setScoresData(emptyScores);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTab === 'scores' && selectedTestId) {
      interval = setInterval(() => {
        // Fetch only tests to update scores silently
        classApi.getTests(classId).then(res => {
          if (res.data && res.data.length > 0) {
            setTests(res.data);
            const currentTest = res.data.find((t: any) => t.id === selectedTestId);
            if (currentTest) {
              setScoresData(prev => {
                const newScores = { ...prev };
                (currentTest.scores || []).forEach((s: any) => {
                  if (newScores[s.studentId]) {
                    newScores[s.studentId].score = s.score;
                    if (!newScores[s.studentId].feedback && s.feedback) {
                      newScores[s.studentId].feedback = s.feedback;
                    }
                  }
                });
                return newScores;
              });
            }
          }
        }).catch(() => {});
      }, 5000); // 5 seconds
    }
    return () => clearInterval(interval);
  }, [activeTab, selectedTestId, classId]);

  const loadScoresFromTest = (testId: string, testList: any[], currentStudents: any[]) => {
    const test = testList.find(t => t.id === testId);
    const scoreList = test?.scores || [];
    
    const scoreMap: Record<string, any> = {};
    currentStudents.forEach(s => {
      scoreMap[s.id] = { score: '', feedback: '' }; 
    });
    
    scoreList.forEach((s: any) => {
      if (scoreMap[s.studentId]) {
        scoreMap[s.studentId] = { 
          score: s.score !== undefined && s.score !== null ? s.score : '', 
          feedback: s.feedback || '' 
        };
      }
    });
    
    setScoresData(scoreMap);
  };

  const handleTestChange = (testId: string) => {
    setSelectedTestId(testId);
    loadScoresFromTest(testId, tests, students);
  };

  const createNewTest = async () => {
    const title = prompt("Nhập Tên Bài kiểm tra (Ví dụ: Kiểm tra giữa kỳ):");
    if (!title) return;
    
    const date = new Date().toISOString().split('T')[0];
    const newTest = {
      classId,
      date,
      title,
      isOnline: false,
      duration: 45,
      questions: []
    };
    
    setSaving(true);
    try {
      await classApi.createTest(classId, newTest);
      await fetchClassData();
    } catch (err) {
      alert("Đã xảy ra lỗi khi tạo bài kiểm tra!");
      console.error(err);
    }
    setSaving(false);
  };
  
  const deleteTest = async (testId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài kiểm tra này? Toàn bộ điểm số của bài này sẽ bị mất!')) return;
    setSaving(true);
    try {
      await classApi.deleteTest(testId);
      alert('Đã xóa bài kiểm tra thành công!');
      setSelectedTestId('');
      await fetchClassData();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi xóa bài kiểm tra!');
    }
    setSaving(false);
  };

  const handleScoreChange = (studentId: string, field: 'score' | 'feedback', value: string) => {
    setScoresData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const saveScores = async () => {
    if (!selectedTestId) return;
    setSaving(true);
    try {
      const payload = students.map(s => ({
        studentId: s.id,
        score: scoresData[s.id]?.score || '',
        feedback: scoresData[s.id]?.feedback || ''
      }));
      
      await classApi.saveTestScores(selectedTestId, payload);
      alert('Lưu bảng điểm thành công!');
      await fetchClassData();
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi lưu vào Database!');
    }
    setSaving(false);
  };

  // --- ONLINE BUILDER LOGIC ---
  const currentTest = tests.find(t => t.id === selectedTestId);
  const [builderData, setBuilderData] = useState<any>(null);

  useEffect(() => {
    if (currentTest && activeTab === 'online_builder') {
      setBuilderData({
        isOnline: currentTest.isOnline || false,
        duration: currentTest.duration || 45,
        questions: currentTest.questions || []
      });
    }
  }, [currentTest, activeTab]);

  const saveOnlineTest = async () => {
    if (!selectedTestId || !builderData) return;
    setSaving(true);
    try {
      await classApi.updateTest(selectedTestId, builderData);
      alert('Đã lưu Cấu hình Bài thi Online!');
      await fetchClassData();
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu bài thi online!');
    }
    setSaving(false);
  };

  const addQuestion = (type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER') => {
    setBuilderData((prev: any) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          id: Math.random().toString(36).substr(2, 9),
          type,
          text: '',
          options: type === 'MULTIPLE_CHOICE' ? [
            { id: 'A', text: '' }, { id: 'B', text: '' }, { id: 'C', text: '' }, { id: 'D', text: '' }
          ] : [],
          correctAnswer: type === 'MULTIPLE_CHOICE' ? 'A' : '',
          points: 10
        }
      ]
    }));
  };

  const updateQuestion = (qId: string, field: string, value: any) => {
    setBuilderData((prev: any) => ({
      ...prev,
      questions: prev.questions.map((q: any) => q.id === qId ? { ...q, [field]: value } : q)
    }));
  };

  const updateOption = (qId: string, optId: string, value: string) => {
    setBuilderData((prev: any) => ({
      ...prev,
      questions: prev.questions.map((q: any) => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.map((opt: any) => opt.id === optId ? { ...opt, text: value } : opt)
          };
        }
        return q;
      })
    }));
  };

  const removeQuestion = (qId: string) => {
    setBuilderData((prev: any) => ({
      ...prev,
      questions: prev.questions.filter((q: any) => q.id !== qId)
    }));
  };

  if (loading) return <div className="p-8 text-center"><span className="spinner"></span> Đang tải dữ liệu...</div>;
  if (!classData) return <div className="p-8 text-center text-red-500">Lỗi: Không tìm thấy lớp học.</div>;

  return (
    <div className="p-6">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 24 }}>
        {/* Left Panel: Tests List */}
        <div className="glass-card" style={{ padding: 20, alignSelf: 'start' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Danh sách Bài kiểm tra</h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
            {tests.map(t => (
              <div 
                key={t.id}
                onClick={() => handleTestChange(t.id)}
                style={{ 
                  padding: '12px 14px', 
                  borderRadius: 8, 
                  cursor: 'pointer',
                  border: selectedTestId === t.id ? '2px solid var(--accent-blue)' : '1px solid var(--border)',
                  background: selectedTestId === t.id ? 'var(--bg-hover)' : 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: selectedTestId === t.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                    {t.title}
                    {t.isOnline && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--accent-blue)', color: '#fff', padding: '2px 6px', borderRadius: 4 }}>ONLINE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Calendar size={12} /> {new Date(t.date).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>
            ))}
            
            {tests.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                Chưa có bài kiểm tra nào.
              </div>
            )}
            
            <button 
              className="btn btn-secondary" 
              style={{ marginTop: 8, justifyContent: 'center', borderStyle: 'dashed' }}
              onClick={createNewTest}
              disabled={saving}
            >
              <Plus size={16} /> Tạo bài kiểm tra
            </button>
          </div>
        </div>

        {/* Right Panel: Content */}
        <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 600 }}>
          {!currentTest ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
              <BarChart2 size={48} style={{ opacity: 0.2 }} />
              <p>Chọn hoặc tạo một Bài kiểm tra để xem chi tiết</p>
            </div>
          ) : (
            <>
              {/* Header & Tabs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {currentTest.title}
                  </h2>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Ngày kiểm tra: {new Date(currentTest.date).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteTest(currentTest.id)} disabled={saving}>
                    <Trash2 size={14} /> Xóa bài KT
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <button 
                  className={`btn ${activeTab === 'scores' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('scores')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <List size={16} /> Bảng Điểm
                </button>
                <button 
                  className={`btn ${activeTab === 'online_builder' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveTab('online_builder')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Settings size={16} /> Cấu hình Thi Online
                </button>
              </div>

              {/* Tab Content: Scores */}
              {activeTab === 'scores' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={fetchClassData} disabled={saving}>
                      Làm mới điểm
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={saveScores} disabled={saving}>
                      {saving ? 'Đang lưu...' : <><Save size={14} /> Lưu bảng điểm</>}
                    </button>
                  </div>
                  <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 50, textAlign: 'center' }}>STT</th>
                          <th style={{ width: 250 }}>Họ và tên</th>
                          <th style={{ width: 120 }}>Điểm số</th>
                          <th>Nhận xét của giáo viên</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, idx) => (
                          <tr key={s.id}>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                            <td>
                              <input 
                                type="number" 
                                className="form-input" 
                                style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}
                                value={scoresData[s.id]?.score || ''}
                                onChange={e => handleScoreChange(s.id, 'score', e.target.value)}
                                placeholder="0-10"
                              />
                            </td>
                            <td>
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ padding: '6px 10px' }}
                                value={scoresData[s.id]?.feedback || ''}
                                onChange={e => handleScoreChange(s.id, 'feedback', e.target.value)}
                                placeholder="Ghi chú điểm mạnh, điểm yếu..."
                              />
                            </td>
                          </tr>
                        ))}
                        {students.length === 0 && (
                          <tr><td colSpan={4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Lớp chưa có học viên nào.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab Content: Online Builder */}
              {activeTab === 'online_builder' && builderData && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={builderData.isOnline} 
                          onChange={e => setBuilderData({...builderData, isOnline: e.target.checked})}
                          style={{ width: 18, height: 18 }}
                        />
                        Bật chế độ thi trực tuyến (Học viên làm bài trên web)
                      </label>
                      {builderData.isOnline && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14 }}>Thời gian làm bài:</span>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ width: 80, padding: '4px 8px' }}
                            value={builderData.duration}
                            onChange={e => setBuilderData({...builderData, duration: Number(e.target.value)})}
                          />
                          <span style={{ fontSize: 14 }}>phút</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <button className="btn btn-primary" onClick={saveOnlineTest} disabled={saving}>
                        {saving ? 'Đang lưu...' : <><Save size={16} /> Lưu Cấu Hình</>}
                      </button>
                    </div>
                  </div>

                  {builderData.isOnline && (
                    <>
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-blue)', padding: 16, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>Link bài thi dành cho học viên:</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 13, userSelect: 'all' }}>
                            {window.location.origin}/exam/{currentTest.id}
                          </div>
                        </div>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/exam/${currentTest.id}`);
                            alert('Đã copy link!');
                          }}
                        >
                          <Copy size={14} /> Copy Link
                        </button>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Nội dung Đề thi ({builderData.questions.length} câu)</h3>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => addQuestion('MULTIPLE_CHOICE')}>+ Trắc nghiệm</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => addQuestion('SHORT_ANSWER')}>+ Điền từ</button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {builderData.questions.map((q: any, idx: number) => (
                            <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, background: '#fff' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ fontWeight: 600 }}>Câu {idx + 1} ({q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Điền từ'})</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                                    Điểm: <input type="number" className="form-input" style={{ width: 60, padding: '2px 6px', height: 26 }} value={q.points} onChange={e => updateQuestion(q.id, 'points', Number(e.target.value))} />
                                  </div>
                                  <button className="btn-icon text-danger" onClick={() => removeQuestion(q.id)}><Trash2 size={16} /></button>
                                </div>
                              </div>

                              <textarea 
                                className="form-input" 
                                style={{ minHeight: 60, marginBottom: 12, resize: 'vertical' }}
                                placeholder="Nhập nội dung câu hỏi..."
                                value={q.text}
                                onChange={e => updateQuestion(q.id, 'text', e.target.value)}
                              />

                              {q.type === 'MULTIPLE_CHOICE' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                  {q.options.map((opt: any) => (
                                    <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <input 
                                          type="radio" 
                                          name={`correct_${q.id}`} 
                                          checked={q.correctAnswer === opt.id}
                                          onChange={() => updateQuestion(q.id, 'correctAnswer', opt.id)}
                                          style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
                                        />
                                        <span style={{ marginLeft: 6, fontWeight: 600 }}>{opt.id}.</span>
                                      </label>
                                      <input 
                                        className="form-input" 
                                        style={{ flex: 1, padding: '6px 10px' }}
                                        placeholder={`Đáp án ${opt.id}`}
                                        value={opt.text}
                                        onChange={e => updateOption(q.id, opt.id, e.target.value)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {q.type === 'SHORT_ANSWER' && (
                                <div>
                                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Đáp án đúng (hệ thống dùng để tự động chấm điểm):</label>
                                  <input 
                                    className="form-input" 
                                    style={{ marginTop: 4 }}
                                    placeholder="Ví dụ: apple"
                                    value={q.correctAnswer}
                                    onChange={e => updateQuestion(q.id, 'correctAnswer', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {builderData.questions.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                              Chưa có câu hỏi nào. Nhấp vào nút thêm ở trên để bắt đầu tạo đề thi.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
