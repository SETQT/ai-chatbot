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
          <Menu.Item key="/dictionary" icon={<BookOutlined />}>
            <Link href="/dictionary">Từ điển Cô Lành</Link>
          </Menu.Item>
          
          {threads.length > 0 && (
            <>
              <Menu.Divider style={{ margin: '12px 0' }} />
              <Menu.ItemGroup title="Lịch sử trò chuyện">
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
              </Menu.ItemGroup>
            </>
          )}
        </Menu>

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
