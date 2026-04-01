'use client';

import { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
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
  ThunderboltOutlined,
  RocketOutlined,
  NotificationOutlined,
} from '@ant-design/icons';

const { Content } = Layout;

const suggestionCards = [
  {
    id: 'check-price',
    icon: <ThunderboltOutlined />,
    title: 'Giá xăng hôm nay',
    desc: 'Tra cứu bảng giá xăng dầu PVOIL mới nhất',
    prompt: 'Xăng hôm nay bao nhiêu?',
  },
  {
    id: 'send-discord',
    icon: <NotificationOutlined />,
    title: 'Gửi báo cáo Discord',
    desc: 'Tra giá và gửi báo cáo lên kênh Discord',
    prompt: 'Tra giá xăng rồi gửi lên Discord giúp Kiều!',
  },
];

const TOOL_LABELS: Record<string, string> = {
  get_fuel_prices: 'Tra giá xăng từ PVOIL',
  send_discord_report: 'Gửi báo cáo lên Discord',
};

// Transport is created outside of component to keep a stable reference
const fuelTransport = new DefaultChatTransport({ api: '/api/fuel' });

export default function FuelView() {
  const { message: antMessage } = App.useApp();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({ transport: fuelTransport });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (error) {
      antMessage.error('Lỗi khi gọi AI, thử lại nhé!');
    }
  }, [error, antMessage]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage({ text });
  };

  const onSuggestionClick = (prompt: string) => {
    if (isLoading) return;
    sendMessage({ text: prompt });
  };

  return (
    <div className="fuel-chat" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <Content className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon-box" style={{ background: 'linear-gradient(135deg, #fa8c16, #d46b08)' }}>
              <ThunderboltOutlined />
            </div>
            <h1 className="welcome-title">Kiều Giá Xăng ⛽</h1>
            <p className="welcome-subtitle">
              Hỏi giá xăng hôm nay bao nhiêu, AI sẽ tự đi lấy dữ liệu.<br />
              Muốn gửi lên Discord? Nói một tiếng là Kiều lo!
            </p>
            <div className="feature-grid" style={{ maxWidth: '500px' }}>
              {suggestionCards.map((card) => (
                <div key={card.id} className="feature-card" onClick={() => onSuggestionClick(card.prompt)}>
                  <div className="feature-icon" style={{ color: '#fa8c16' }}>{card.icon}</div>
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
            {messages.map((m, index) => {
              if (m.role !== 'user' && m.role !== 'assistant') return null;

              const textContent = m.parts
                ?.filter((part: any) => part.type === 'text')
                .map((part: any) => part.text)
                .join('');

              const toolParts = (m.parts ?? []).filter((part: any) => 
                String(part.type).startsWith('tool') || part.type === 'dynamic-tool'
              );

              if (m.role === 'assistant' && !textContent && toolParts.length === 0) return null;

              return (
                <div key={m.id} className={`message-item ${m.role === 'user' ? 'user' : 'assistant'}`}>
                  <div className="bubble">
                    {/* Tool specific labels in a list */}
                    {toolParts.length > 0 && (
                      <div className="tool-status-list" style={{ marginBottom: textContent ? 12 : 0 }}>
                        {toolParts.map((part: any, pIdx: number) => {
                          const type = String(part.type || '');
                          const toolName = part.toolName || (type.startsWith('tool-') ? type.replace('tool-', '') : null) || part.toolInvocation?.toolName;
                          if (!toolName || toolName === 'invocation' || toolName === 'call') return null;
                          
                          const label = TOOL_LABELS[toolName] || toolName;
                          const state = part.state || part.status;
                          const isFinished = state === 'result' || state === 'output-available' || state === 'finished';
                          const args = part.input || part.args || part.toolInvocation?.args || {};

                          return (
                            <div key={pIdx} className={`tool-status-badge ${isFinished ? 'finished' : 'active'}`}>
                              <div className="badge-main">
                                {isFinished ? '✅ ' : '🚀 '}
                                {label} {isFinished ? 'thành công' : '...'}
                                {!isFinished && (
                                  <div className="typing-indicator mini" style={{ display: 'inline-flex', marginLeft: 8 }}>
                                    <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
                                  </div>
                                )}
                              </div>
                              {/* Display all input parameters EXCEPT technical 'reason' */}
                              {args && Object.keys(args).filter(k => k !== 'reason').length > 0 && (
                                <div className="tool-args">
                                  {Object.entries(args)
                                    .filter(([key]) => key !== 'reason')
                                    .map(([key, val]) => (
                                      <div key={key} style={{ display: 'flex', gap: 4 }}>
                                        <span style={{ opacity: 0.8, fontWeight: 700 }}>{key}:</span>
                                        <span style={{ 
                                          overflow: 'hidden', 
                                          textOverflow: 'ellipsis', 
                                          whiteSpace: 'nowrap',
                                          maxWidth: '300px'
                                        }}>
                                          {typeof val === 'string' ? val : JSON.stringify(val)}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {textContent && <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>}
                  </div>
                </div>
              );
            })}

            {isLoading && (() => {
              const lastMessage = messages[messages.length - 1];
              // Only show the generic typing indicator if the last message has no content at all yet
              const hasContent = lastMessage?.role === 'assistant' && (lastMessage.parts?.length ?? 0) > 0;
              if (!hasContent) {
                return (
                  <div className="message-item assistant">
                    <div className="bubble">
                      <div className="typing-indicator">
                        <div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            <div ref={messagesEndRef} />
          </div>
        )}
      </Content>

      <div className="chat-input-wrapper">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="chat-input-container">
          <RocketOutlined style={{ color: '#fa8c16' }} />
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Hỏi giá xăng hoặc gửi báo cáo Discord..."
            variant="borderless"
            autoSize={{ minRows: 1, maxRows: 6 }}
          />
          <Button
            className="send-btn"
            type="primary"
            icon={<SendOutlined />}
            htmlType="submit"
            disabled={!input.trim() || isLoading}
            style={{ background: isLoading ? undefined : 'linear-gradient(135deg, #fa8c16, #d46b08)' }}
          />
        </form>
        <div className="disclaimer-text">AI CÓ THỂ ĐƯA RA CÂU TRẢ LỜI CHƯA CHÍNH XÁC.</div>
      </div>
    </div>
  );
}
