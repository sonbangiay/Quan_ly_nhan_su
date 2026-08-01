'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      console.error("Login error details:", err);
      let msg = 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      if (err?.code === 'auth/invalid-credential' || err?.message?.includes('invalid-credential')) {
        msg = 'Tài khoản hoặc mật khẩu không chính xác.';
      } else if (err?.code === 'auth/network-request-failed') {
        msg = 'Lỗi kết nối mạng. Vui lòng kiểm tra lại đường truyền internet.';
      } else if (err?.message) {
        msg = `Lỗi kết nối Firebase: ${err.message}`;
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top left, rgba(79,142,247,0.12) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(168,85,247,0.12) 0%, transparent 50%), var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      {/* Background decorations */}
      <div style={{
        position: 'fixed', top: '10%', left: '5%', width: 300, height: 300,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.06), transparent)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '5%', width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06), transparent)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeInUp 0.5s ease' }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 16px',
            background: 'var(--gradient-main)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(79,142,247,0.35)',
          }}>
            <Building2 size={36} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Nhân Phú HRM
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 15 }}>
            Hệ thống Quản lý Nhân sự
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Công ty Du học Nhân Phú
          </p>
        </div>

        {/* Login form */}
        <div className="glass-card" style={{ padding: 32, animation: 'fadeInUp 0.5s ease 0.1s both' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
            Đăng nhập tài khoản
          </h2>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#ef4444',
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Email công ty</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="email@nhanphu.edu.vn"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="form-label">Mật khẩu</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center'
                  }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner" />
              ) : (
                <><LogIn size={18} /> Đăng nhập</>
              )}
            </button>
          </form>
        </div>


      </div>
    </div>
  );
}
