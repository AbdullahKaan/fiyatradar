'use client';

import { useEffect, useState } from 'react';
import { SearchBar } from './search-bar';

const PHRASES = ['iPhone 15...', 'Samsung TV...', 'Nike Air Max...', 'MacBook Air...', 'Dyson süpürge...'];

export function AnimatedHeroSearch() {
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');

  useEffect(() => {
    const phrase = PHRASES[idx % PHRASES.length] ?? '';
    if (text.length < phrase.length) {
      const t = setTimeout(() => setText(phrase.slice(0, text.length + 1)), 80);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => { setText(''); setIdx((i) => i + 1); }, 1600);
    return () => clearTimeout(t);
  }, [text, idx]);

  return <SearchBar size="lg" placeholder={text || ' '} />;
}
