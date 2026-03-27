'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Layout,
  Input,
  Button,
  App,
} from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  AudioOutlined,
  StarOutlined,
  BookOutlined,
  EditOutlined,
  TranslationOutlined,
} from '@ant-design/icons';
import { useAuth } from './AuthProvider';
import { useSearchParams, useRouter } from 'next/navigation';

const { Content } = Layout;

const featureCards = [
  { id: 'grammar', icon: <BookOutlined />, title: 'Giải thích ngữ pháp bài 15', desc: 'Ôn lại cấu trúc câu điều kiện loại 2', prompt: 'Cô ơi, giải thích cho em ngữ pháp bài 15 về câu điều kiện loại 2 với!' },
  { id: 'speaking', icon: <AudioOutlined />, title: 'Luyện nói về chủ đề công việc', desc: 'Thực hành các mẫu câu phỏng vấn', prompt: 'Cô ơi, luyện nói với em về chủ đề công việc và phỏng vấn đi ạ!' },
  { id: 'vocabulary', icon: <EditOutlined />, title: 'Kiểm tra từ vựng hôm nay', desc: 'Quiz 10 từ chủ đề Global Economy', prompt: 'Cô ơi, kiểm tra từ vựng cho em chủ đề Global Economy!' },
  { id: 'writing', icon: <TranslationOutlined />, title: 'Sửa bài viết Writing Task 1', desc: 'Gửi bài luận của bạn để được góp ý', prompt: 'Cô ơi, em gửi bài viết Writing Task 1, cô sửa giúp em nhé!' },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatView() {
  const { message } = App.useApp();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const threadId = searchParams.get('threadId');

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tin nhắn
  useEffect(() => {
    if (!user || !threadId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await fetch(`/api/messages?userId=${user.id}&threadId=${threadId}`);
        const data = await res.json();
        if (res.ok && data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadMessages();
  }, [user, threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    
    if (isLoading) {
      message.loading('Đang xử lý câu hỏi trước đó...', 1);
      return;
    }

    if (text.length > 500) {
      message.error('Câu hỏi tối đa 500 ký tự thôi nè! 😅');
      return;
    }

    // Xóa input ngay lập tức trước khi làm bất cứ việc gì khác
    setInputValue('');
    sendMessage({ text });
  };

  const onFeatureClick = (prompt: string) => {
    if (isLoading) return;
    setInputValue('');
    sendMessage({ text: prompt });
  };

  const sendMessage = async (params: { text: string }) => {
    if (!params.text.trim() || !user) return;
    
    setIsLoading(true);
    let currentThreadId = threadId;

    // 1. Thread handling
    if (!currentThreadId) {
      try {
        const resThread = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, title: params.text.slice(0, 30) }),
        });
        const threadData = await resThread.json();
        if (resThread.ok && threadData.thread) {
          currentThreadId = threadData.thread.id;
          router.replace(`/chat?threadId=${currentThreadId}`, { scroll: false });
        } else {
          throw new Error('Thread creation failed');
        }
      } catch (err) {
        setIsLoading(false);
        message.error('Lỗi tạo hội thoại.');
        return;
      }
    }

    // 2. Save User Message & Check Quota
    try {
      const saveRes = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, threadId: currentThreadId, role: 'user', content: params.text }),
      });
      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        message.warning(saveData.error);
        setIsLoading(false);
        return;
      }

      setMessages((prev) => [...prev, { id: saveData.message.id, role: 'user', content: params.text }]);
    } catch (err) {
      setIsLoading(false);
      message.error('Lỗi server!');
      return;
    }

    // 3. AI response
    let accumulatedText = '';
    const assistantMsgId = Date.now().toString();

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, { role: 'user', content: params.text }].map(m => ({ role: m.role, content: m.content })) 
        }),
      });

      if (!resp.ok) throw new Error('AI Error');

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulatedText += decoder.decode(value, { stream: true });
          
          setMessages((prev) => 
            prev.map(m => m.id === assistantMsgId ? { ...m, content: accumulatedText } : m)
          );
        }

        // 4. Save Assistant Response
        if (accumulatedText.trim()) {
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, threadId: currentThreadId, role: 'assistant', content: accumulatedText }),
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Content className="messages-container">
        {isLoadingHistory ? (
          <div className="welcome-screen">
            <div className="typing-indicator" style={{ padding: '40px 0' }}><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon-box"><StarOutlined /></div>
            <h1 className="welcome-title">Xin chào, tôi là Cô Minh AI</h1>
            <p className="welcome-subtitle">Tôi có thể giúp bạn học tiếng Anh mỗi ngày.</p>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="message-item assistant">
                <div className="bubble">
                  <div className="typing-indicator"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Content>

      <div className="chat-input-wrapper">
        <div className="chat-input-container">
          <PaperClipOutlined />
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Hỏi Cô Minh..."
            variant="borderless"
            autoSize={{ minRows: 1, maxRows: 6 }}
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
        <div className="disclaimer-text">AI CÓ THỂ ĐƯA RA CÂU TRẢ LỜI CHƯA CHÍNH XÁC.</div>
      </div>
    </>
  );
}
