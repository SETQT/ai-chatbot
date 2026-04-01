'use client';

import { Layout, Menu, Input, Typography, Button, Space, Divider } from 'antd';
import {
  CommentOutlined,
  BookOutlined,
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

const { Sider, Content } = Layout;
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
  const [collapsedSections, setCollapsedSections] = useState({
    cominh: false,
    colanh: true,
    kieu: true,
  });

  const activeThreadId = searchParams.get('threadId');
  const isChatPage = pathname.startsWith('/chat');

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
    : (pathname.startsWith('/dictionary') ? '/dictionary' : (pathname.startsWith('/fuel') ? '/fuel' : ''));

  return (
    <Layout className="chat-layout">
      {/* Sidebar */}
      <Sider width={280} className="chat-sider" breakpoint="lg" collapsedWidth={0}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }} className="sidebar-scrollable-content">
            {/* ===== PHẦN 1: Học viện Cô Minh ===== */}
            <div className={`sidebar-section section-cominh ${collapsedSections.cominh ? 'collapsed' : ''}`}>
              <div className="section-header" onClick={() => toggleSection('cominh')}>
                <div className="header-info">
                  <CommentOutlined className="header-icon" />
                  <div className="header-text">
                    <div className="header-title">Học viện Cô Minh</div>
                    <div className="header-subtitle">AI English Teacher</div>
                  </div>
                </div>
                {collapsedSections.cominh ? <DownOutlined /> : <UpOutlined />}
              </div>
              {!collapsedSections.cominh && (
                <div className="section-content">
                  <div style={{ padding: '12px' }}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      block 
                      size="large"
                      onClick={handleNewChat}
                      className="new-chat-btn"
                    >
                      Cuộc trò chuyện mới
                    </Button>
                  </div>
                  <Menu
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    className="sidebar-menu"
                  >
                    <Menu.Item key="/chat" icon={<CommentOutlined />}>
                      <Link href="/chat">Hội thoại hiện tại</Link>
                    </Menu.Item>
                  </Menu>

                  {threads.length > 0 && (
                    <div className="history-container">
                      <div className="history-label">Lịch sử trò chuyện</div>
                      <Menu mode="inline" selectedKeys={[selectedKey]} className="sidebar-menu">
                        {threads.slice(0, 10).map((thread) => (
                          <Menu.Item key={`thread-${thread.id}`} icon={<MessageOutlined />} className="thread-menu-item">
                            <Link href={`/chat?threadId=${thread.id}`}>{thread.title}</Link>
                          </Menu.Item>
                        ))}
                      </Menu>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ===== PHẦN 2: Từ điển Cô Lành ===== */}
            <div className={`sidebar-section section-colanh ${collapsedSections.colanh ? 'collapsed' : ''}`}>
              <div className="section-header" onClick={() => toggleSection('colanh')}>
                <div className="header-info">
                  <BookOutlined className="header-icon" />
                  <div className="header-text">
                    <div className="header-title">Từ điển Cô Lành</div>
                    <div className="header-subtitle">English Dictionary</div>
                  </div>
                </div>
                {collapsedSections.colanh ? <DownOutlined /> : <UpOutlined />}
              </div>
              {!collapsedSections.colanh && (
                <div className="section-content">
                  <Menu mode="inline" selectedKeys={[selectedKey]} className="sidebar-menu">
                    <Menu.Item key="/dictionary" icon={<BookOutlined />}>
                      <Link href="/dictionary">Mở từ điển</Link>
                    </Menu.Item>
                  </Menu>
                </div>
              )}
            </div>

            {/* ===== PHẦN 3: Kiều Giá Xăng ===== */}
            <div className={`sidebar-section section-kieu ${collapsedSections.kieu ? 'collapsed' : ''}`}>
              <div className="section-header" onClick={() => toggleSection('kieu')}>
                <div className="header-info">
                  <ThunderboltOutlined className="header-icon" />
                  <div className="header-text">
                    <div className="header-title">Kiều Giá Xăng</div>
                    <div className="header-subtitle">PVOIL Fuel Prices</div>
                  </div>
                </div>
                {collapsedSections.kieu ? <DownOutlined /> : <UpOutlined />}
              </div>
              {!collapsedSections.kieu && (
                <div className="section-content">
                  <Menu mode="inline" selectedKeys={[selectedKey]} className="sidebar-menu">
                    <Menu.Item key="/fuel" icon={<ThunderboltOutlined />}>
                      <Link href="/fuel">Tra giá & Gửi Discord</Link>
                    </Menu.Item>
                  </Menu>
                </div>
              )}
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
        </div>
      </Sider>

      {/* Main Container */}
      <Layout className="chat-content">
        <Content style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
