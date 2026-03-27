'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Modal, Input, Button, Typography, message, Space } from 'antd';
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

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Kiểm tra session từ localStorage khi mount
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

      setUser(data.user);
      localStorage.setItem('co_minh_user', JSON.stringify(data.user));
      message.success(`Chào mừng ${data.user.display_name || data.user.username}! 🎉`);
    } catch (err) {
      message.error('Lỗi kết nối server!');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('co_minh_user');
    setUsername('');
    setPassword('');
    message.info('Đã đăng xuất');
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  // Chưa đăng nhập → hiện modal login
  if (!user) {
    return (
      <div className="auth-backdrop">
        <div className="auth-container">
          {/* Decorative background */}
          <div className="auth-bg-pattern" />
          
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                <BookOutlined />
              </div>
              <Title level={3} style={{ margin: 0, color: '#1a1a2e', fontWeight: 700 }}>
                Học viện Cô Minh
              </Title>
              <Text style={{ color: '#64748b', fontSize: 14 }}>
                THE ACADEMIC ATELIER
              </Text>
            </div>

            <div className="auth-form">
              <div className="auth-input-group">
                <label className="auth-label">Tên đăng nhập</label>
                <Input
                  size="large"
                  prefix={<UserOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Nhập username..."
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
                  placeholder="Nhập password..."
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

              <Text className="auth-hint">
                Demo: <strong>admin</strong> / <strong>123456</strong>
              </Text>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
