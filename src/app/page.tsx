'use client';

import { useState } from 'react';
import ChatPage from './components/ChatPage';
import DictionaryPage from './components/DictionaryPage';

export default function Home() {
  const [activePage, setActivePage] = useState('chat');

  const handleNavigate = (key: string) => {
    setActivePage(key);
  };

  switch (activePage) {
    case 'dictionary':
      return <DictionaryPage onNavigate={handleNavigate} />;
    case 'chat':
    default:
      return <ChatPage onNavigate={handleNavigate} />;
  }
}
