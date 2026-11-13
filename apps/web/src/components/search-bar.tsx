'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn, CATEGORY_OPTIONS } from '@/lib/utils';

interface SearchBarProps {
  defaultQuery?: string;
  defaultCategory?: string;
  size?: 'md' | 'lg';
  showCategory?: boolean;
  placeholder?: string;
  className?: string;
  onDebouncedChange?: (value: string) => void;
}

export function SearchBar({
  defaultQuery = '',
  defaultCategory = '',
  size = 'md',
  showCategory = true,
  placeholder = 'Ürün, marka veya model ara...',
  className,
  onDebouncedChange,
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(defaultQuery);
  const [category, setCategory] = useState(defaultCategory);

  useEffect(() => {
    if (!onDebouncedChange) return;
    const t = setTimeout(() => onDebouncedChange(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query, onDebouncedChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    router.push(`/ara?${params.toString()}` as never);
  };

  const lg = size === 'lg';
  return (
    <form
      onSubmit={submit}
      role="search"
      className={cn(
        'flex w-full items-center gap-2 rounded-2xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-primary/40 dark:border-slate-700 dark:bg-slate-900',
        lg ? 'p-2' : 'p-1',
        className,
      )}
    >
      <Search className={cn('ml-2 shrink-0 text-slate-400', lg ? 'h-6 w-6' : 'h-4 w-4')} />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Ürün ara"
        className={cn('min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400', lg ? 'py-3 text-lg' : 'py-1.5 text-sm')}
      />
      <kbd className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 md:inline dark:border-slate-700">
        Ctrl+K
      </kbd>
      {showCategory && (
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Kategori"
          className={cn('hidden rounded-xl border-0 bg-slate-100 px-2 text-slate-700 outline-none sm:block dark:bg-slate-800 dark:text-slate-200', lg ? 'py-3 text-sm' : 'py-1.5 text-xs')}
        >
          <option value="">Tüm Kategoriler</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
      <button type="submit" className={cn('btn-primary', lg ? 'px-6 py-3 text-base' : 'px-3 py-1.5')}>
        Ara
      </button>
    </form>
  );
}
