'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchAll, SearchResult } from '@/lib/actions/search';
import { Search, Loader2, X, AlertCircle } from 'lucide-react';

export default function SearchAll() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const searchMatches = await searchAll(query);
        setResults(searchMatches);
        setIsOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(url);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 w-4 h-4 text-text-secondary pointer-events-none" />
        <input
          type="text"
          placeholder="Search pillars, products, research..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          className="w-full h-10 pl-10 pr-10 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-full focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-secondary/50 font-sans"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 w-4 h-4 text-primary animate-spin" />
        )}
        {!loading && query && (
          <button
            onClick={handleClear}
            className="absolute right-3.5 p-0.5 hover:bg-surface-mid rounded-full text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown List */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border-warm rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border-warm custom-scrollbar">
            {results.length > 0 ? (
              results.map((res) => (
                <button
                  key={`${res.type}-${res.id}`}
                  onClick={() => handleSelect(res.url)}
                  className="w-full p-4 text-left hover:bg-surface-container transition-colors block border-l-2 border-transparent hover:border-primary font-sans group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary">
                      {res.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1 line-clamp-1 group-hover:text-primary transition-colors font-sans">
                    {res.title}
                  </h4>
                  {res.snippet && (
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: res.snippet }} />
                  )}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-text-secondary">
                <AlertCircle className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                <p className="text-sm">No results found matching "{query}"</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
