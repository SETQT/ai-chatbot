'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Layout,
  Menu,
  Input,
  Button,
  Typography,
  Avatar,
  Badge,
  message,
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

export default function ChatView() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<{ id: string; role: string; content: string; parts: { type: string; text: string }[] }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    if (inputValue.length > 100) {
      message.error('Câu hỏi dài quá nè, tối đa 100 kí tự thôi nhé! 😅');
      return;
    }
    const text = inputValue;
    setInputValue('');
    sendMessage({ text });
  };

  const onFeatureClick = (prompt: string) => {
    if (isLoading) return;
    setInputValue('');
    sendMessage({ text: prompt });
  };

  const sendMessage = async (params: { text: string }) => {
    if (!params.text.trim()) return;
    
    setIsLoading(true);
    const userMessageId = Date.now().toString();
    const newUserMessage = {
      id: userMessageId,
      role: 'user',
      content: params.text,
      parts: [{ type: 'text', text: params.text }],
    };
    
    setMessages((prev) => [...prev, newUserMessage]);

    const assistantMsgId = (Date.now() + 1).toString();
    let accumulatedText = '';

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, newUserMessage].map(m => ({ role: m.role, content: m.content })) 
        }),
      });

      if (!resp.ok) throw new Error('Failed to fetch chat');

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        // Initial assistant message
        setMessages((prev) => [
          ...prev,
          { id: assistantMsgId, role: 'assistant', content: '', parts: [{ type: 'text', text: '' }] },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedText, parts: [{ type: 'text', text: accumulatedText }] }
                : msg
            )
          );
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="message-item assistant">
                <div className="bubble">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
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
            onPressEnter={handleSend}
            placeholder="Hỏi Cô Minh bất cứ điều gì về tiếng Anh..."
            variant="borderless"
            maxLength={100}
            showCount
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
    </>
  );
}
