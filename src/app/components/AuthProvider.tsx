'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { App, Input, Button, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface User {
  id: string;
  username: string;
  display_name: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, logout: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

// Tách nội dung Login ra để đảm bảo nằm TRONG App context
function LoginContent({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) {
  const { message } = App.useApp();
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      message.warning('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || 'Đăng nhập thất bại!');
        return;
      }

      onLoginSuccess(data.user);
      message.success(`Chào mừng ${data.user.display_name || data.user.username}! 🎉`);
    } catch (err) {
      message.error('Lỗi kết nối server!');
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="auth-backdrop">
      <div className="auth-container">
        <div className="auth-bg-pattern" />
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon"><BookOutlined /></div>
            <Title level={3} style={{ margin: 0, color: '#1a1a2e', fontWeight: 700 }}>Học viện Cô Minh</Title>
            <Text style={{ color: '#64748b', fontSize: 14 }}>THE ACADEMIC ATELIER</Text>
          </div>

          <div className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label">Tên đăng nhập</label>
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Nhập tên đăng nhập..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onPressEnter={handleLogin}
                className="auth-input"
              />
            </div>

            <div className="auth-input-group">
              <label className="auth-label">Mật khẩu</label>
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: '#94a3b8' }} />}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onPressEnter={handleLogin}
                className="auth-input"
              />
            </div>

            <Button
              type="primary"
              size="large"
              block
              loading={loginLoading}
              onClick={handleLogin}
              className="auth-submit-btn"
            >
              Đăng nhập
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('co_minh_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem('co_minh_user');
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('co_minh_user');
  };

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('co_minh_user', JSON.stringify(userData));
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <LoginContent onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
