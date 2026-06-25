'use client';
import { useState, useEffect, use } from 'react';
import { classApi } from '@/lib/api';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ExamPage({ params }: { params: Promise<{ testId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const testId = resolvedParams.testId;

  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  
  const [step, setStep] = useState<'LOGIN' | 'WAITING' | 'TESTING' | 'RESULT' | 'REVIEW'>('LOGIN');
  const [phone, setPhone] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [error, setError] = useState('');

  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const res = await classApi.getTestById(testId);
      if (!res.data.isOnline) {
        setError('Bài kiểm tra này không hỗ trợ làm trực tuyến.');
        setLoading(false);
      } else {
        setTestData(res.data);
        // Auto login if already logged in portal
        const savedUser = localStorage.getItem('student_user');
        if (savedUser) {
          const userObj = JSON.parse(savedUser);
          if (userObj.phone) {
             await processLogin(userObj.phone, res.data);
             return; // processLogin will handle loading
          }
        }
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Không tìm thấy bài kiểm tra.');
      setLoading(false);
    }
  };

  const processLogin = async (phoneStr: string, tData: any) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'students'), where('phone', '==', phoneStr.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setError('Không tìm thấy học viên với số điện thoại này.');
      } else {
        const studentData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        
        const existingScore = tData.scores?.find((s: any) => s.studentId === studentData.id);
        if (existingScore) {
          setStudent(studentData);
          setResult({ score: existingScore.score, submittedAt: existingScore.submittedAt });
          setAnswers(existingScore.submissionData || {});
          setStep('RESULT');
        } else {
          setStudent(studentData);
          setStep('WAITING');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi khi xác thực.');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!phone) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }
    await processLogin(phone, testData);
  };

  const startTest = () => {
    setTimeLeft(testData.duration * 60);
    setStep('TESTING');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'TESTING' && timeLeft > 0) {
      timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (step === 'TESTING' && timeLeft === 0) {
      submitTest(); // Auto submit
    }
    return () => clearTimeout(timer);
  }, [timeLeft, step]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAnswer = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const submitTest = async () => {
    if (submitting) return;
    setSubmitting(true);
    
    try {
      // Calculate Score
      const questions = testData.questions || [];
      let totalPoints = 0;
      let earnedPoints = 0;
      
      questions.forEach((q: any) => {
        totalPoints += Number(q.points || 0);
        const studentAnswer = answers[q.id]?.trim().toLowerCase() || '';
        const correctAnswer = q.correctAnswer?.trim().toLowerCase() || '';
        
        if (studentAnswer === correctAnswer) {
          earnedPoints += Number(q.points || 0);
        }
      });
      
      // Scale to 10
      const finalScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 10 : 0;
      const roundedScore = Math.round(finalScore * 100) / 100;
      
      await classApi.submitOnlineTest(testId, student.id, roundedScore, answers);
      
      setResult({ score: roundedScore, submittedAt: new Date().toISOString() });
      setStep('RESULT');
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi nộp bài!');
    }
    setSubmitting(false);
  };

  if (loading && step === 'LOGIN') {
    return <div className="p-8 text-center" style={{ marginTop: '20vh' }}><span className="spinner"></span> Đang tải...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="https://i.imgur.com/Wp7u7hC.png" alt="Logo" style={{ height: 32 }} />
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>HRM Nhân Phú</h1>
        </div>
        {step === 'TESTING' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: timeLeft < 60 ? 'var(--danger-light)' : 'var(--bg-secondary)', color: timeLeft < 60 ? 'var(--danger)' : 'var(--text-primary)', padding: '8px 16px', borderRadius: 20, fontWeight: 700 }}>
            <Clock size={18} />
            <span style={{ fontSize: 18 }}>{formatTime(timeLeft)}</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px 20px', maxWidth: 800, margin: '0 auto', width: '100%' }}>
        {error && (
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: 16, borderRadius: 8, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {step === 'LOGIN' && testData && (
          <div className="glass-card" style={{ padding: 32, textAlign: 'center', maxWidth: 400, margin: '40px auto' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{testData.title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Vui lòng xác thực bằng Số điện thoại của bạn để vào làm bài.</p>
            
            <form onSubmit={handleLogin}>
              <input 
                type="tel" 
                className="form-input" 
                placeholder="Nhập số điện thoại của bạn"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{ width: '100%', marginBottom: 16, textAlign: 'center', fontSize: 18, padding: 12 }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 16 }} disabled={loading}>
                {loading ? 'Đang xác thực...' : 'Xác thực & Vào phòng thi'}
              </button>
            </form>
          </div>
        )}

        {step === 'WAITING' && testData && (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', background: 'var(--success-light)', color: 'var(--success)', padding: '12px', borderRadius: '50%', marginBottom: 16 }}>
              <CheckCircle size={48} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Xin chào, {student?.fullName}!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>Bạn đã đăng nhập thành công vào phòng thi.</p>
            
            <div style={{ background: 'var(--bg-secondary)', padding: 24, borderRadius: 12, textAlign: 'left', marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>Thông tin Bài thi</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Môn thi:</span>
                  <span style={{ fontWeight: 600 }}>{testData.title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Thời gian làm bài:</span>
                  <span style={{ fontWeight: 600 }}>{testData.duration} phút</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Số lượng câu hỏi:</span>
                  <span style={{ fontWeight: 600 }}>{testData.questions?.length || 0} câu</span>
                </div>
              </div>
            </div>

            <div style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 24, fontWeight: 600 }}>
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
              Lưu ý: Thời gian sẽ bắt đầu đếm ngược ngay khi bạn bấm nút bên dưới. Không được tải lại trang (F5) trong quá trình làm bài!
            </div>

            <button className="btn btn-primary" onClick={startTest} style={{ fontSize: 18, padding: '14px 40px', borderRadius: 30 }}>
              Bắt đầu làm bài
            </button>
          </div>
        )}

        {step === 'TESTING' && testData && (
          <div style={{ paddingBottom: 100 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 16 }}>
              {testData.title}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {(testData.questions || []).map((q: any, idx: number) => (
                <div key={q.id} className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Câu {idx + 1}:</h3>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12 }}>{q.points} điểm</span>
                  </div>
                  <div style={{ fontSize: 16, marginBottom: 20, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{q.text}</div>
                  
                  {q.type === 'MULTIPLE_CHOICE' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {q.options.map((opt: any) => (
                        <label 
                          key={opt.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '12px 16px', 
                            border: `1px solid ${answers[q.id] === opt.id ? 'var(--accent-blue)' : 'var(--border)'}`, 
                            borderRadius: 8,
                            background: answers[q.id] === opt.id ? 'var(--bg-hover)' : '#fff',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input 
                            type="radio" 
                            name={`q_${q.id}`} 
                            value={opt.id}
                            checked={answers[q.id] === opt.id}
                            onChange={(e) => handleAnswer(q.id, e.target.value)}
                            style={{ width: 18, height: 18, accentColor: 'var(--accent-blue)' }}
                          />
                          <span style={{ marginLeft: 12, fontWeight: answers[q.id] === opt.id ? 600 : 400, fontSize: 15 }}>
                            {opt.id}. {opt.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'SHORT_ANSWER' && (
                    <div>
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ width: '100%', padding: 12, fontSize: 16 }}
                        placeholder="Nhập câu trả lời của bạn..."
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswer(q.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'center', zIndex: 10, boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ width: '100%', maxWidth: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                  Đã làm: <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{Object.keys(answers).length}</span> / {testData.questions?.length} câu
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (confirm('Bạn có chắc chắn muốn nộp bài? Bạn sẽ không thể sửa lại sau khi nộp.')) {
                      submitTest();
                    }
                  }}
                  disabled={submitting}
                  style={{ fontSize: 16, padding: '10px 32px' }}
                >
                  {submitting ? 'Đang nộp bài...' : <><Send size={18} /> Nộp bài ngay</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'RESULT' && (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', margin: '40px auto' }}>
            <div style={{ display: 'inline-flex', background: 'var(--success-light)', color: 'var(--success)', padding: '16px', borderRadius: '50%', marginBottom: 24 }}>
              <CheckCircle size={64} />
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Nộp bài thành công!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>Cảm ơn bạn đã hoàn thành bài kiểm tra.</p>
            
            <div style={{ background: 'var(--bg-secondary)', padding: 32, borderRadius: 16, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 8 }}>Điểm số của bạn:</div>
              <div style={{ fontSize: 64, fontWeight: 900, color: 'var(--accent-blue)', lineHeight: 1 }}>
                {result?.score} <span style={{ fontSize: 24, color: 'var(--text-muted)', fontWeight: 600 }}>/ 10</span>
              </div>
            </div>
            
            <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setStep('REVIEW')}>
                Xem lại bài làm
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/student/login')}>
                Đóng trang này
              </button>
            </div>
          </div>
        )}

        {step === 'REVIEW' && testData && (
          <div style={{ paddingBottom: 100 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '2px solid var(--border)', paddingBottom: 16 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>
                {testData.title} (Xem lại)
              </h2>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-blue)' }}>
                {result?.score} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/ 10</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {(testData.questions || []).map((q: any, idx: number) => {
                const studentAnswer = answers[q.id]?.trim().toLowerCase() || '';
                const correctAnswer = q.correctAnswer?.trim().toLowerCase() || '';
                const isCorrect = studentAnswer === correctAnswer;
                
                return (
                  <div key={q.id} className="glass-card" style={{ padding: 24, border: `2px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: isCorrect ? 'var(--success)' : 'var(--danger)' }}>
                        Câu {idx + 1}: {isCorrect ? 'ĐÚNG' : 'SAI'}
                      </h3>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 12 }}>{q.points} điểm</span>
                    </div>
                    <div style={{ fontSize: 16, marginBottom: 20, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{q.text}</div>
                    
                    {q.type === 'MULTIPLE_CHOICE' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {q.options.map((opt: any) => {
                          const isThisCorrect = q.correctAnswer === opt.id;
                          const isThisSelected = answers[q.id] === opt.id;
                          
                          let bg = '#fff';
                          let border = 'var(--border)';
                          if (isThisCorrect) {
                            bg = 'var(--success-light)';
                            border = 'var(--success)';
                          } else if (isThisSelected && !isThisCorrect) {
                            bg = 'var(--danger-light)';
                            border = 'var(--danger)';
                          }
                          
                          return (
                            <label 
                              key={opt.id} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                padding: '12px 16px', 
                                border: `1px solid ${border}`, 
                                borderRadius: 8,
                                background: bg,
                                cursor: 'default',
                                opacity: (!isThisSelected && !isThisCorrect) ? 0.7 : 1
                              }}
                            >
                              <input 
                                type="radio" 
                                disabled
                                checked={isThisSelected}
                                style={{ width: 18, height: 18 }}
                              />
                              <span style={{ marginLeft: 12, fontWeight: isThisSelected || isThisCorrect ? 600 : 400, fontSize: 15 }}>
                                {opt.id}. {opt.text}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'SHORT_ANSWER' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ background: isCorrect ? 'var(--success-light)' : 'var(--danger-light)', padding: 12, borderRadius: 8, border: `1px solid ${isCorrect ? 'var(--success)' : 'var(--danger)'}` }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Câu trả lời của bạn:</span>
                          <div style={{ fontSize: 16, marginTop: 4, fontWeight: 600 }}>{answers[q.id] || '(Bỏ trống)'}</div>
                        </div>
                        {!isCorrect && (
                          <div style={{ background: 'var(--success-light)', padding: 12, borderRadius: 8, border: '1px dashed var(--success)' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>Đáp án đúng:</span>
                            <div style={{ fontSize: 16, marginTop: 4, fontWeight: 600 }}>{q.correctAnswer}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'center', zIndex: 10, boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
              <button className="btn btn-secondary" onClick={() => setStep('RESULT')} style={{ fontSize: 16, padding: '10px 32px' }}>
                <ArrowLeft size={18} /> Quay lại
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
