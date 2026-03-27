'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Layout,
  Input,
  Button,
  message,
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
  role: string;
  content: string;
}

export default function ChatView() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const threadId = searchParams.get('threadId');

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load tin nhắn khi threadId thay đổi
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

  // Lưu tin nhắn vào Supabase kèm theo threadId
  const saveMessage = async (role: string, content: string, currentThreadId: string) => {
    if (!user || !currentThreadId) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, threadId: currentThreadId, role, content }),
      });
    } catch (err) {
      console.error('Failed to save message:', err);
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    if (inputValue.length > 500) {
      message.error('Câu hỏi dài quá nè, tối đa 500 kí tự thôi nhé! 😅');
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
    if (!params.text.trim() || !user) return;
    
    setIsLoading(true);
    let currentThreadId = threadId;

    // Nếu chưa có threadId, hãy tạo một thread mới ngay bây giờ
    if (!currentThreadId) {
      try {
        const resThread = await fetch('/api/threads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, title: params.text.slice(0, 30) + (params.text.length > 30 ? '...' : '') }),
        });
        const threadData = await resThread.json();
        if (resThread.ok && threadData.thread) {
          currentThreadId = threadData.thread.id;
          // Cập nhật URL mà không reload trang
          router.replace(`/chat?threadId=${currentThreadId}`, { scroll: false });
        } else {
          throw new Error('Could not create thread');
        }
      } catch (err) {
        console.error('Thread creation error:', err);
        message.error('Không thể tạo cuộc hội thoại mới.');
        setIsLoading(false);
        return;
      }
    }

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: params.text,
    };
    
    setMessages((prev) => [...prev, newUserMessage]);
    saveMessage('user', params.text, currentThreadId!);

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
        setMessages((prev) => [
          ...prev,
          { id: assistantMsgId, role: 'assistant', content: '' },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: accumulatedText }
                : msg
            )
          );
        }

        if (accumulatedText.trim()) {
          saveMessage('assistant', accumulatedText, currentThreadId!);
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
      <Content className="messages-container">
        {isLoadingHistory ? (
          <div className="welcome-screen">
            <div className="typing-indicator" style={{ padding: '40px 0' }}>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
            <p style={{ color: '#94a3b8' }}>Đang tải tin nhắn...</p>
          </div>
        ) : messages.length === 0 ? (
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

      <div className="chat-input-wrapper">
        <div className="chat-input-container">
          <PaperClipOutlined />
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Hỏi Cô Minh..."
            variant="borderless"
            autoSize={{ minRows: 1, maxRows: 6 }}
            maxLength={500}
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
