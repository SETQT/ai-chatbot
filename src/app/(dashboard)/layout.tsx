'use client';

import { Layout, Menu, Input, Avatar, Badge, Typography, Button, Space, Divider } from 'antd';
import {
  CommentOutlined,
  BookOutlined,
  SearchOutlined,
  BellOutlined,
  LogoutOutlined,
  PlusOutlined,
  MessageOutlined,
  DownOutlined,
  UpOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';
import { useEffect, useState, useCallback } from 'react';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);

  const activeThreadId = searchParams.get('threadId');
  const isChatPage = pathname.startsWith('/chat');

  const fetchThreads = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/threads?userId=${user.id}`);
      const data = await res.json();
      if (res.ok && data.threads) {
        setThreads(data.threads);
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Refetch threads when a new message is sent OR when navigating generally
  // Simple periodic refresh or trigger on specific events would be better, 
  // but for now, we'll refresh on navigation to /chat
  useEffect(() => {
    if (isChatPage) {
      fetchThreads();
    }
  }, [isChatPage, fetchThreads]);

  const handleNewChat = () => {
    router.push('/chat');
  };

  const selectedKey = isChatPage 
    ? (activeThreadId ? `thread-${activeThreadId}` : 'new-chat')
    : (pathname.startsWith('/dictionary') ? '/dictionary' : '');

  return (
    <Layout className="chat-layout">
      {/* Sidebar */}
      <Sider width={280} className="chat-sider" breakpoint="lg" collapsedWidth={0}>
        {/* ===== PHẦN 1: Học viện Cô Minh ===== */}
        <div className="sider-header">
          <Title level={4} className="logo-title">Học viện Cô Minh</Title>
          <Text className="logo-subtitle">THE ACADEMIC ATELIER</Text>
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            block 
            size="large"
            onClick={handleNewChat}
            style={{ 
              borderRadius: '12px',
              height: '48px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(9, 88, 217, 0.2)'
            }}
          >
            Cuộc trò chuyện mới
          </Button>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          className="sidebar-menu"
          style={{ flex: 1, overflowY: 'auto', borderRight: 0 }}
        >
          <Menu.Item key="/chat" icon={<CommentOutlined />}>
            <Link href="/chat">Hội thoại hiện tại</Link>
          </Menu.Item>
        </Menu>

        {/* Lịch sử trò chuyện — collapsible */}
        {threads.length > 0 && (
          <div style={{ borderTop: '1px solid #f0f0f0' }}>
            <div
              onClick={() => setHistoryCollapsed(!historyCollapsed)}
              style={{
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                color: '#8c8c8c',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <span>Lịch sử trò chuyện</span>
              {historyCollapsed ? (
                <DownOutlined style={{ fontSize: '10px' }} />
              ) : (
                <UpOutlined style={{ fontSize: '10px' }} />
              )}
            </div>
            <div
              style={{
                maxHeight: historyCollapsed ? 0 : '9999px',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease',
              }}
            >
              <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                className="sidebar-menu"
                style={{ borderRight: 0 }}
              >
                {threads.map((thread) => (
                  <Menu.Item
                    key={`thread-${thread.id}`}
                    icon={<MessageOutlined style={{ fontSize: '14px', opacity: 0.7 }} />}
                    className="thread-menu-item"
                  >
                    <Link href={`/chat?threadId=${thread.id}`}>
                      {thread.title}
                    </Link>
                  </Menu.Item>
                ))}
              </Menu>
            </div>
          </div>
        )}


        {/* ===== PHẦN 2: Từ điển Cô Lành ===== */}
        <div
          style={{
            borderTop: '2px solid #e8e8e8',
            background: pathname.startsWith('/dictionary')
              ? 'linear-gradient(135deg, #f6ffed 0%, #e6fffb 100%)'
              : '#fafafa',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
          }}
          onClick={() => router.push('/dictionary')}
        >
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: pathname.startsWith('/dictionary')
                  ? 'linear-gradient(135deg, #52c41a, #389e0d)'
                  : 'linear-gradient(135deg, #b7eb8f, #95de64)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <BookOutlined style={{ fontSize: '18px', color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: pathname.startsWith('/dictionary') ? '#389e0d' : '#1f2937',
                  lineHeight: 1.3,
                }}
              >
                Từ điển Cô Lành
              </div>
              <div style={{ fontSize: '11px', color: '#8c8c8c', lineHeight: 1.3 }}>
                Tra từ vựng tiếng Anh
              </div>
            </div>
          </div>
        </div>

        {/* ===== PHẦN 3: Kiều Giá Xăng ===== */}
        <div
          style={{
            borderTop: '1px solid #e8e8e8',
            background: pathname.startsWith('/fuel')
              ? 'linear-gradient(135deg, #fff7e6 0%, #fff1b8 100%)'
              : '#fafafa',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
          }}
          onClick={() => router.push('/fuel')}
        >
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: pathname.startsWith('/fuel')
                  ? 'linear-gradient(135deg, #fa8c16, #d46b08)'
                  : 'linear-gradient(135deg, #ffd591, #ffc069)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ThunderboltOutlined style={{ fontSize: '18px', color: '#fff' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: pathname.startsWith('/fuel') ? '#d46b08' : '#1f2937',
                  lineHeight: 1.3,
                }}
              >
                Kiều Giá Xăng
              </div>
              <div style={{ fontSize: '11px', color: '#8c8c8c', lineHeight: 1.3 }}>
                Tra giá xăng & gửi Discord
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
           <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              block
              style={{ color: '#64748b', textAlign: 'left', padding: '0 12px' }}
            >
              Đăng xuất
            </Button>
        </div>
      </Sider>

      {/* Main Container */}
      <Layout className="chat-content">
        {/* Header */}
        <Header className="chat-header-main">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm nội dung..."
            className="header-search"
            variant="borderless"
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Badge dot color="#f5222d">
              <BellOutlined style={{ fontSize: '20px', color: '#64748b' }} />
            </Badge>
            
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{user?.display_name || user?.username || 'User'}</span>
                <span className="user-status">Premium Student</span>
              </div>
              <Avatar
                size={40}
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'default'}`}
                style={{ backgroundColor: '#f0f0f0', border: '2px solid #fff' }}
              />
            </div>
          </div>
        </Header>

        <Content style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
