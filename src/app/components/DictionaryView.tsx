'use client';

import { useState } from 'react';
import {
  App,
  Input,
  Button,
  Typography,
  Card,
  Tag,
  Space,
  Spin,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  ReadOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface DictionaryResult {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  grammar_notes: string[];
  level: 'Dễ' | 'Trung bình' | 'Khó';
}

export default function DictionaryView() {
  const { message } = App.useApp();
  const [inputValue, setInputValue] = useState('');
  const [object, setObject] = useState<DictionaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          // Try to parse partial JSON for "Streaming" effect
          try {
            const partial = accumulatedText.trim();
            if (partial.startsWith('{') && partial.endsWith('}')) {
              const parsed = JSON.parse(partial);
              setObject(parsed);
            } else {
              const lastBrace = accumulatedText.lastIndexOf('}');
              if (lastBrace !== -1) {
                const validPart = accumulatedText.substring(0, lastBrace + 1);
                setObject(JSON.parse(validPart));
              }
            }
          } catch (e) {
            // Silence partial parse errors
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
    fetchDictionary(word);
  };

  return (
    <div className='dictionary-page'>
      {/* Hero Section */}
      <div className='dict-hero'>
        <div className='welcome-icon-box dict-icon-box'>
          <ReadOutlined />
        </div>
        <h1 className='welcome-title'>Từ điển Cô Lành</h1>
        <p className='welcome-subtitle'>
          Giải thích từ vựng tiếng Anh theo phong cách "cà khịa" <br /> cực
          kỳ dễ nhớ và nhây bựa.
        </p>

        {/* Search Input */}
        <div className='dict-search-box'>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='Nhập từ vựng, ví dụ: "procrastinate"'
            maxLength={100}
            showCount
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            suffix={
              <Button
                type='primary'
                className='dict-search-btn'
                onClick={handleSearch}
                loading={isLoading}
              >
                Tra từ
              </Button>
            }
            className='dict-search-input'
          />

          <div className='dict-suggestions'>
            {['ambiguous', 'resilient', 'paradigm', 'eloquent'].map((tag) => (
              <Tag
                key={tag}
                className='dict-suggestion-tag'
                onClick={() => {
                  setInputValue(tag);
                  fetchDictionary(tag);
                }}
              >
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !object && (
        <div className='dict-loading'>
          <Spin size='large' />
          <div className='dict-loading-text'>
            Cô Lành đang "vắt óc" suy nghĩ...
          </div>
        </div>
      )}

      {/* Result Section */}
      {object && (
        <div className='dict-result-wrapper'>
          <Card variant="borderless" className='dict-result-card'>
            {/* Word & Phonetic */}
            <div className='dict-word-header'>
              <div className='dict-word-main'>
                <h2 className='dict-word-text'>{object.word}</h2>
                <div className='dict-phonetic'>[{object.phonetic}]</div>
              </div>
              <Tag
                color={
                  object.level === 'Dễ'
                    ? 'green'
                    : object.level === 'Trung bình'
                    ? 'orange'
                    : 'red'
                }
                className='dict-level-tag'
              >
                {object.level}
              </Tag>
            </div>

            {/* Meaning & Example */}
            <Descriptions
              column={1}
              className='dict-descriptions'
              styles={{
                label: { fontWeight: 700, width: '120px', color: '#64748b' },
                content: { fontSize: '15px' }
              }}
            >
              <Descriptions.Item label='Nghĩa là gì?'>
                <span className='dict-meaning'>{object.meaning}</span>
              </Descriptions.Item>
              <Descriptions.Item label='Ví dụ "nhây"'>
                <span className='dict-example'>{object.example}</span>
              </Descriptions.Item>
            </Descriptions>

            {/* Grammar Notes */}
            {object.grammar_notes && object.grammar_notes.length > 0 && (
              <div className='dict-grammar-section'>
                <h3 className='dict-grammar-title'>Ghi chú của Cô Lành</h3>
                <Space direction='vertical' style={{ width: '100%' }} size={12}>
                  {object.grammar_notes.map((note, idx) => (
                    <div key={idx} className='dict-grammar-note'>
                      <div className='dict-grammar-bullet'>{idx + 1}</div>
                      <div>{note}</div>
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {isLoading && (
              <div className='dict-streaming-indicator'>
                <Spin size='small' />
                <Text type='secondary' italic>
                  Đang tải thêm chi tiết...
                </Text>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
