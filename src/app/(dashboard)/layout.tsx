'use client';

import { Layout, Menu, Input, Avatar, Badge, Typography, Button } from 'antd';
import {
  CommentOutlined,
  BookOutlined,
  SearchOutlined,
  BellOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../components/AuthProvider';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: '/chat', icon: <CommentOutlined />, label: 'AI Mentor' },
  { key: '/dictionary', icon: <BookOutlined />, label: 'Từ điển Cô Lành' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const selectedKey = menuItems.find(item => pathname.startsWith(item.key))?.key || '/chat';

  return (
    <Layout className="chat-layout">
      {/* Sidebar */}
      <Sider width={260} className="chat-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="sider-header">
          <Title level={4} className="logo-title">Học viện Cô Minh</Title>
          <Text className="logo-subtitle">THE ACADEMIC ATELIER</Text>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          className="sidebar-menu"
        >
          {menuItems.map((item) => (
            <Menu.Item key={item.key} icon={item.icon}>
              <Link href={item.key}>{item.label}</Link>
            </Menu.Item>
          ))}
        </Menu>
      </Sider>

      {/* Main Container */}
      <Layout className="chat-content">
        {/* Header */}
        <Header className="chat-header-main">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm..."
            className="header-search"
            variant="borderless"
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Badge dot color="#f5222d">
              <BellOutlined style={{ fontSize: '20px', color: '#64748b' }} />
            </Badge>
            
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ color: '#64748b', fontSize: '14px' }}
            >
              Đăng xuất
            </Button>
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{user?.display_name || user?.username || 'User'}</span>
                <span className="user-status">Học viên Premium</span>
              </div>
              <Avatar
                size={40}
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'default'}`}
                style={{ backgroundColor: '#f0f0f0' }}
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
