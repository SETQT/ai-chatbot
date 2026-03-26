'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useRef, useEffect } from 'react';
import {
  Layout,
  Menu,
  Input,
  Button,
  Typography,
  Avatar,
  Badge,
} from 'antd';
import {
  SendOutlined,
  DashboardOutlined,
  CommentOutlined,
  ReadOutlined,
  BookOutlined,
  BulbOutlined,
  SettingOutlined,
  SearchOutlined,
  BellOutlined,
  PaperClipOutlined,
  AudioOutlined,
  StarOutlined,
  EditOutlined,
  TranslationOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'chat', icon: <CommentOutlined />, label: 'AI Mentor' },
  { key: 'dictionary', icon: <BookOutlined />, label: 'Từ điển Cô Lành' },
  { key: 'courses', icon: <ReadOutlined />, label: 'Khóa học của tôi' },
  { key: 'library', icon: <BookOutlined />, label: 'Thư viện' },
  { key: 'practice', icon: <BulbOutlined />, label: 'Luyện tập' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
];

const featureCards = [
  { id: 'grammar', icon: <BookOutlined />, title: 'Giải thích ngữ pháp bài 15', desc: 'Ôn lại cấu trúc câu điều kiện loại 2', prompt: 'Cô ơi, giải thích cho em ngữ pháp bài 15 về câu điều kiện loại 2 với!' },
  { id: 'speaking', icon: <AudioOutlined />, title: 'Luyện nói về chủ đề công việc', desc: 'Thực hành các mẫu câu phỏng vấn', prompt: 'Cô ơi, luyện nói với em về chủ đề công việc và phỏng vấn đi ạ!' },
  { id: 'vocabulary', icon: <EditOutlined />, title: 'Kiểm tra từ vựng hôm nay', desc: 'Quiz 10 từ chủ đề Global Economy', prompt: 'Cô ơi, kiểm tra từ vựng cho em chủ đề Global Economy!' },
  { id: 'writing', icon: <TranslationOutlined />, title: 'Sửa bài viết Writing Task 1', desc: 'Gửi bài luận của bạn để được góp ý', prompt: 'Cô ơi, em gửi bài viết Writing Task 1, cô sửa giúp em nhé!' },
];

interface ChatPageProps {
  onNavigate: (key: string) => void;
}

export default function ChatPage({ onNavigate }: ChatPageProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    sendMessage({ text: inputValue });
    setInputValue('');
  };

  const onFeatureClick = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

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
          selectedKeys={['chat']}
          items={menuItems}
          className="sidebar-menu"
          onClick={({ key }) => onNavigate(key)}
        />
      </Sider>

      {/* Main Container */}
      <Layout className="chat-content">
        {/* Header */}
        <Header className="chat-header-main">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm kiếm trong hội thoại..."
            className="header-search"
            variant="borderless"
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Badge dot color="#f5222d">
              <BellOutlined style={{ fontSize: '20px', color: '#64748b' }} />
            </Badge>
            
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">Võ Minh Tâm</span>
                <span className="user-status">Học viên Premium</span>
              </div>
              <Avatar
                size={40}
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                style={{ backgroundColor: '#f0f0f0' }}
              />
            </div>
          </div>
        </Header>

        {/* Messages / Welcome */}
        <Content className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <div className="welcome-icon-box"><StarOutlined /></div>
              <h1 className="welcome-title">Xin chào, tôi là Cô Minh AI</h1>
              <p className="welcome-subtitle">
                Tôi có thể giúp bạn giải thích ngữ pháp, luyện giao tiếp<br />hoặc kiểm tra từ vựng hôm nay.
              </p>
              
              <div className="feature-grid">
                {featureCards.map((card) => (
                  <div key={card.id} className="feature-card" onClick={() => onFeatureClick(card.prompt)}>
                    <div className="feature-icon">{card.icon}</div>
                    <div className="feature-content">
                      <div className="feature-title">{card.title}</div>
                      <div className="feature-desc">{card.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((m) => (
                <div key={m.id} className={`message-item ${m.role === 'user' ? 'user' : 'assistant'}`}>
                  <div className="bubble">
                    {m.parts.map((p, i) => (p.type === 'text' ? <span key={i}>{p.text}</span> : null))}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                <div className="message-item assistant">
                  <div className="bubble" style={{ fontStyle: 'italic', opacity: 0.7 }}>Cô Minh đang soạn bài...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Content>

        {/* Input Area */}
        <div className="chat-input-wrapper">
          <div className="chat-input-container">
            <PaperClipOutlined />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Hỏi Cô Minh bất cứ điều gì về tiếng Anh..."
              variant="borderless"
            />
            <AudioOutlined />
            <Button
              className="send-btn"
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
            />
          </div>
          <div className="disclaimer-text">AI CÓ THỂ ĐƯA RA CÂU TRẢ LỜI CHƯA CHÍNH XÁC, HÃY LUÔN KIỂM CHỨNG LẠI VỚI GIÁO VIÊN.</div>
        </div>
      </Layout>
    </Layout>
  );
}
