import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MagnifyingGlassIcon, MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { aiSearch } from '../../api/axios';

const DEBOUNCE_MS = 300;
const MAX_VISIBLE = 8;
const SpeechRecognition = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

const formatPrice = (p) => `$${Number(p).toFixed(2)}`;

const SmartSearch = ({ inputClassName = '', iconClassName = '', placeholder = 'Search our collection...' }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [filters, setFilters] = useState(null);
    const [state, setState] = useState('idle');   // idle | loading | results | empty | rate_limited | budget_exhausted | error
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const containerRef = useRef(null);
    const debounceTimer = useRef(null);
    const abortRef = useRef(null);
    const recognitionRef = useRef(null);

    // ─── Debounced search ───────────────────────────────────────────────────
    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        if (abortRef.current) abortRef.current.abort();

        const trimmed = query.trim();
        if (!trimmed) {
            setState('idle');
            setResults([]);
            setFilters(null);
            return;
        }

        debounceTimer.current = setTimeout(async () => {
            const controller = new AbortController();
            abortRef.current = controller;
            setState('loading');

            try {
                const { data } = await aiSearch(trimmed, controller.signal);
                setResults(data?.results ?? []);
                setFilters(data?.filters ?? null);
                setState((data?.results?.length ?? 0) === 0 ? 'empty' : 'results');
            } catch (err) {
                if (axios.isCancel(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
                if (err.response?.status === 429) setState('rate_limited');
                else if (err.response?.status === 503) setState('budget_exhausted');
                else setState('error');
            }
        }, DEBOUNCE_MS);

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [query]);

    // ─── Close dropdown on outside click ────────────────────────────────────
    useEffect(() => {
        const onClick = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    // ─── Voice input (progressive enhancement) ──────────────────────────────
    const startListening = () => {
        if (!SpeechRecognition) return;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const transcript = event.results[0]?.[0]?.transcript ?? '';
            if (transcript) {
                setQuery(transcript);
                setIsOpen(true);
            }
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognitionRef.current = recognition;
        setIsListening(true);
        try { recognition.start(); } catch { setIsListening(false); }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { /* ignore */ }
        }
        setIsListening(false);
    };

    // ─── Form submit (Enter key) ────────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = query.trim();
        if (trimmed) {
            navigate(`/search?q=${encodeURIComponent(trimmed)}`);
            setIsOpen(false);
        }
    };

    const handleResultClick = () => setIsOpen(false);

    const showDropdown = isOpen && query.trim().length > 0;

    return (
        <div ref={containerRef} className="relative w-full">
            <form onSubmit={handleSubmit} className="relative w-full group">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`w-full pl-5 pr-20 py-2.5 rounded-full border focus:outline-none focus:ring-1 focus:ring-[#C6A35E] focus:border-[#C6A35E] transition-all font-sans text-sm ${inputClassName}`}
                    aria-label="Search products"
                    aria-autocomplete="list"
                    aria-expanded={showDropdown}
                />
                {/* Clear button */}
                {query && (
                    <button
                        type="button"
                        onClick={() => { setQuery(''); setIsOpen(false); }}
                        className={`absolute right-12 top-1/2 -translate-y-1/2 ${iconClassName}`}
                        aria-label="Clear search"
                    >
                        <XMarkIcon className="h-4 w-4 opacity-60 hover:opacity-100" />
                    </button>
                )}
                {/* Mic — only rendered if Web Speech API exists */}
                {SpeechRecognition && (
                    <button
                        type="button"
                        onClick={isListening ? stopListening : startListening}
                        className={`absolute right-8 top-1/2 -translate-y-1/2 ${iconClassName} ${isListening ? 'animate-pulse text-[#C6A35E]' : ''}`}
                        aria-label={isListening ? 'Stop voice input' : 'Voice search'}
                        title={isListening ? 'Listening… click to stop' : 'Voice search'}
                    >
                        <MicrophoneIcon className={`h-4 w-4 ${isListening ? '' : 'opacity-60 hover:opacity-100'}`} />
                    </button>
                )}
                {/* Submit / icon */}
                <button
                    type="submit"
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${iconClassName}`}
                    aria-label="Submit search"
                >
                    <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
            </form>

            {/* Listening banner */}
            {isListening && (
                <div className="absolute left-0 right-0 -bottom-1 translate-y-full mt-2 z-50">
                    <div className="bg-white border border-[#C6A35E]/30 rounded-md shadow-soft px-4 py-2 text-xs text-[#C6A35E] flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#C6A35E] animate-pulse" />
                        Listening… speak your search
                    </div>
                </div>
            )}

            {/* Dropdown */}
            {showDropdown && !isListening && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-gray-100 rounded-md shadow-soft overflow-hidden">
                    {/* Active filter chips */}
                    {state === 'results' && filters && (filters.price_max || filters.price_min || filters.category || filters.brand || filters.color) && (
                        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-gray-100 bg-[#F8F7F4]">
                            <span className="text-[10px] uppercase tracking-widest text-gray-400">Detected:</span>
                            {filters.price_max && <FilterChip>Under ${filters.price_max}</FilterChip>}
                            {filters.price_min && <FilterChip>From ${filters.price_min}</FilterChip>}
                            {filters.brand && <FilterChip>Brand: {filters.brand}</FilterChip>}
                            {filters.color && <FilterChip>Color: {filters.color}</FilterChip>}
                            {filters.category && <FilterChip>Cat: {filters.category}</FilterChip>}
                        </div>
                    )}

                    {/* States */}
                    {state === 'loading' && (
                        <div className="px-4 py-6 text-center text-sm text-gray-400">Searching…</div>
                    )}

                    {state === 'empty' && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                            No products matched <span className="font-medium text-[#1A1A1A]">"{query}"</span>.
                        </div>
                    )}

                    {state === 'rate_limited' && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                            Searching too quickly — please wait a moment and try again.
                        </div>
                    )}

                    {state === 'budget_exhausted' && (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">
                            AI search is taking a break today. Try again tomorrow, or press Enter for keyword results.
                        </div>
                    )}

                    {state === 'error' && (
                        <div className="px-4 py-6 text-center text-sm text-red-500">
                            Something went wrong. Press Enter for full search.
                        </div>
                    )}

                    {state === 'results' && (
                        <ul className="max-h-[26rem] overflow-y-auto divide-y divide-gray-50">
                            {results.slice(0, MAX_VISIBLE).map((p) => (
                                <li key={p.id}>
                                    <Link
                                        to={`/product/${p.id}`}
                                        onClick={handleResultClick}
                                        className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8F7F4] transition-colors"
                                    >
                                        <div className="w-12 h-12 bg-gray-100 rounded-sm overflow-hidden flex-shrink-0">
                                            {p.image_url ? (
                                                <img
                                                    src={p.image_url}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-sans text-[#1A1A1A] truncate">{p.name}</p>
                                            <p className="text-[11px] text-gray-400 truncate">
                                                {p.vendor_name || '—'}
                                            </p>
                                        </div>
                                        <span className="text-sm font-medium text-[#C6A35E] flex-shrink-0">
                                            {formatPrice(p.price)}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                            {results.length > MAX_VISIBLE && (
                                <li className="px-4 py-2 text-center bg-[#F8F7F4]">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className="text-xs uppercase tracking-widest text-[#C6A35E] hover:underline"
                                    >
                                        See all {results.length} results
                                    </button>
                                </li>
                            )}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

const FilterChip = ({ children }) => (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#C6A35E]/30 text-[#1A1A1A]">
        {children}
    </span>
);

export default SmartSearch;
