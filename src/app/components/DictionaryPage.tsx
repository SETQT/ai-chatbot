'use client';

import { useState } from 'react';
import {
  Layout,
  Menu,
  Input,
  Button,
  Typography,
  Avatar,
  Badge,
  Card,
  Tag,
  Descriptions,
  Spin,
  message,
  Space,
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
  SoundOutlined,
} from '@ant-design/icons';

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const levelColorMap: Record<string, string> = {
  'Dễ': 'green',
  'Trung bình': 'orange',
  'Khó': 'red',
};

interface DictionaryPageProps {
  onNavigate: (key: string) => void;
}

interface VocabularyObject {
  word?: string;
  phonetic?: string;
  meaning?: string;
  example?: string;
  grammar_notes?: string[];
  level?: string;
}

export default function DictionaryPage({ onNavigate }: DictionaryPageProps) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [object, setObject] = useState<VocabularyObject | null>(null);

  const fetchDictionary = async (word: string) => {
    setIsLoading(true);
    setObject(null);

    try {
      const response = await fetch('/api/dictionary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });

      if (!response.ok) throw new Error('API Error');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          accumulatedText += text;

          // Attempt to parse mid-stream if we have valid JSON
          // Minimal partial parsing for JSON is difficult, so we'll try basic validation
          try {
            // Find start of JSON object {
            const indexStart = accumulatedText.indexOf('{');
            if (indexStart !== -1) {
              const attemptStr = accumulatedText.slice(indexStart);
              // Crude way to handle partial JSON is hard; 
              // for now we'll just update when more characters look like a full object
              // In production, we'd use a parser like json-joy or similar
              if (attemptStr.endsWith('}') || attemptStr.includes('"}')) {
                const parsed = JSON.parse(attemptStr + (attemptStr.endsWith('}') ? '' : '}'));
                setObject(parsed);
              }
            }
          } catch (e) {
            // Ignore partial parse errors
          }
        }
        
        // Final Parse
        try {
          const finalParsed = JSON.parse(accumulatedText);
          setObject(finalParsed);
        } catch (e) {
          console.error('Final JSON parse error:', e);
        }
      }
    } catch (err) {
      console.error(err);
      message.error('AI không thể định nghĩa được từ này, thử từ khác nhé!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!inputValue.trim()) {
      message.warning('Nhập từ vựng vào đi bạn ơi! 😅');
      return;
    }
    if (inputValue.length > 100) {
      message.error('Từ gì mà dài thế! Tối đa 100 kí tự thôi nhé! 😅');
      return;
    }
    const word = inputValue.trim();
    setInputValue('');
    fetchDictionary(word);
  };

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'chat', icon: <CommentOutlined />, label: 'AI Mentor' },
    { key: 'dictionary', icon: <BookOutlined />, label: 'Từ điển Cô Lành' },
    { key: 'courses', icon: <ReadOutlined />, label: 'Khóa học của tôi' },
    { key: 'library', icon: <BookOutlined />, label: 'Thư viện' },
    { key: 'practice', icon: <BulbOutlined />, label: 'Luyện tập' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt' },
  ];

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
          selectedKeys={['dictionary']}
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
            placeholder="Tìm kiếm từ vựng..."
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

        {/* Dictionary Content */}
        <Content className="messages-container">
          <div className="dictionary-page">
            {/* Welcome / Search Area */}
            <div className="dict-hero">
              <div className="welcome-icon-box dict-icon-box">
                <BookOutlined />
              </div>
              <h1 className="welcome-title">Từ điển của Cô Lành</h1>
              <p className="welcome-subtitle">
                Nhập một từ tiếng Anh, Cô Lành sẽ &quot;mổ xẻ&quot; nó theo cách bạn chưa từng thấy! 🤪
              </p>

              <div className="dict-search-box">
                <Input
                  size="large"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder='Nhập từ vựng, ví dụ: "procrastinate"'
                  maxLength={100}
                  showCount
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  suffix={
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSearch}
                      loading={isLoading}
                      className="dict-search-btn"
                    >
                      Tra từ
                    </Button>
                  }
                  className="dict-search-input"
                />
              </div>
            </div>

            {/* Loading State */}
            {isLoading && !object && (
              <div className="dict-loading">
                <Spin size="large" />
                <Text className="dict-loading-text">Cô Lành đang tìm kiếm cho bạn... 🔍</Text>
              </div>
            )}

            {/* Result Card */}
            {object && (
              <div className="dict-result-wrapper">
                <Card className="dict-result-card" bordered={false}>
                  {/* Word Header */}
                  <div className="dict-word-header">
                    <div className="dict-word-main">
                      <h2 className="dict-word-text">{object.word || '...'}</h2>
                      <span className="dict-phonetic">
                        <SoundOutlined style={{ marginRight: 6 }} />
                        {object.phonetic || '...'}
                      </span>
                    </div>
                    {object.level && (
                      <Tag
                        color={levelColorMap[object.level]}
                        className="dict-level-tag"
                      >
                        {object.level}
                      </Tag>
                    )}
                  </div>

                  {/* Meaning & Example */}
                  <Descriptions
                    column={1}
                    bordered
                    size="middle"
                    className="dict-descriptions"
                    labelStyle={{
                      fontWeight: 600,
                      width: '140px',
                      background: '#f8fafc',
                      color: '#475569',
                    }}
                    contentStyle={{
                      background: '#ffffff',
                    }}
                  >
                    <Descriptions.Item label="📖 Nghĩa">
                      <span className="dict-meaning">{object.meaning || '...'}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="💬 Ví dụ">
                      <span className="dict-example">{object.example || '...'}</span>
                    </Descriptions.Item>
                  </Descriptions>

                  {/* Grammar Notes */}
                  {object.grammar_notes && object.grammar_notes.length > 0 && (
                    <div className="dict-grammar-section">
                      <h4 className="dict-grammar-title">📝 Lưu ý ngữ pháp</h4>
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {object.grammar_notes.filter(Boolean).map((note, idx) => (
                          <div key={idx} className="dict-grammar-note">
                            <span className="dict-grammar-bullet">{idx + 1}</span>
                            <span>{note}</span>
                          </div>
                        ))}
                      </Space>
                    </div>
                  )}
                </Card>

                {/* Streaming indicator */}
                {isLoading && (
                  <div className="dict-streaming-indicator">
                    <Spin size="small" />
                    <Text type="secondary" style={{ fontSize: 13 }}>Đang nhận dữ liệu từ Cô Lành...</Text>
                  </div>
                )}
              </div>
            )}

            {/* Empty State - Feature Cards */}
            {!object && !isLoading && (
              <div className="dict-suggestions">
                <Text type="secondary" style={{ fontSize: 14, marginBottom: 16, display: 'block' }}>
                  💡 Thử tra những từ này xem:
                </Text>
                <Space wrap size={8}>
                  {['serendipity', 'procrastinate', 'eloquent', 'resilience', 'nostalgia', 'ubiquitous'].map((w) => (
                    <Tag
                      key={w}
                      className="dict-suggestion-tag"
                      onClick={() => {
                        setInputValue(w);
                        fetchDictionary(w);
                      }}
                    >
                      {w}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
