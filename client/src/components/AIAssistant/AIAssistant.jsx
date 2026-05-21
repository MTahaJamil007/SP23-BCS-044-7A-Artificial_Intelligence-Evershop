import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { XMarkIcon, PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { aiChat } from '../../api/axios';
import ProductCard from './ProductCard';

const SESSION_KEY = 'evershop_ai_session';
const HISTORY_KEY = 'evershop_ai_history';
const PRODUCT_TOKEN = /\[product:(\d+)\]/g;

const STARTER_PROMPTS = [
    'Recommend a gift under $50',
    'Find me a laptop for programming',
    "What's your return policy?",
];

// ─── Markdown component overrides ───────────────────────────────────────────
// We swap `[product:N]` tokens for inline ProductCard before passing to ReactMarkdown,
// using a custom node type. To keep things simple, we pre-split the text and render
// inline.

function renderMessageBody(text) {
    if (!text) return null;
    const segments = [];
    let last = 0;
    let m;
    PRODUCT_TOKEN.lastIndex = 0;
    while ((m = PRODUCT_TOKEN.exec(text)) !== null) {
        if (m.index > last) segments.push({ kind: 'md', value: text.slice(last, m.index) });
        segments.push({ kind: 'product', id: parseInt(m[1], 10) });
        last = m.index + m[0].length;
    }
    if (last < text.length) segments.push({ kind: 'md', value: text.slice(last) });

    return segments.map((seg, i) =>
        seg.kind === 'product' ? (
            <ProductCard key={`p-${i}-${seg.id}`} productId={seg.id} />
        ) : (
            <div key={`md-${i}`} className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0 prose-headings:font-serif">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.value}</ReactMarkdown>
            </div>
        )
    );
}

const AIAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState(() => {
        try {
            const raw = sessionStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    });
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [sessionId, setSessionId] = useState(() => sessionStorage.getItem(SESSION_KEY) || null);
    const [error, setError] = useState(null);

    const listRef = useRef(null);
    const inputRef = useRef(null);

    // Persist history
    useEffect(() => {
        try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages)); } catch { /* ignore quota */ }
    }, [messages]);

    // Persist session id
    useEffect(() => {
        if (sessionId) sessionStorage.setItem(SESSION_KEY, sessionId);
    }, [sessionId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, sending]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const send = async (text) => {
        const trimmed = (text ?? input).trim();
        if (!trimmed || sending) return;

        const userMsg = { role: 'user', content: trimmed, ts: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setSending(true);
        setError(null);

        try {
            const { data } = await aiChat({ session_id: sessionId, message: trimmed });
            if (data.session_id) setSessionId(data.session_id);
            const botMsg = { role: 'assistant', content: data.reply, sources: data.sources || [], ts: Date.now() };
            setMessages((prev) => [...prev, botMsg]);
        } catch (err) {
            const status = err.response?.status;
            let msg = "Sorry — I couldn't respond. Please try again.";
            if (status === 429) msg = 'Slow down a moment — too many requests in a row.';
            else if (status === 503) msg = err.response?.data?.error || 'AI assistant is taking a break right now.';
            setError(msg);
            setMessages((prev) => [...prev, { role: 'assistant', content: `_${msg}_`, ts: Date.now(), error: true }]);
        } finally {
            setSending(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        send();
    };

    const clearChat = () => {
        setMessages([]);
        setSessionId(null);
        sessionStorage.removeItem(HISTORY_KEY);
        sessionStorage.removeItem(SESSION_KEY);
    };

    return (
        <>
            {/* Floating button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#1A1A1A] text-white shadow-xl hover:bg-[#C6A35E] transition-all flex items-center justify-center group"
                    aria-label="Open AI shopping assistant"
                >
                    <SparklesIcon className="h-6 w-6" />
                    <span className="absolute right-full mr-3 whitespace-nowrap text-[10px] uppercase tracking-widest bg-[#1A1A1A] text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Ask Concierge
                    </span>
                </button>
            )}

            {/* Panel */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-2rem)] bg-white rounded-lg shadow-2xl border border-gray-100 flex flex-col">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-[#1A1A1A] text-white rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="h-4 w-4 text-[#C6A35E]" />
                            <div>
                                <div className="text-sm font-serif">EverShop Concierge</div>
                                <div className="text-[10px] uppercase tracking-widest text-white/60">AI Shopping Assistant</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {messages.length > 0 && (
                                <button
                                    onClick={clearChat}
                                    className="text-[10px] uppercase tracking-widest text-white/60 hover:text-white px-2"
                                    title="Clear chat history"
                                >
                                    Reset
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded"
                                aria-label="Close assistant"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-[#FAFAF8]">
                        {messages.length === 0 && (
                            <div className="text-center py-6">
                                <p className="text-sm text-gray-500 mb-3">Hi — I'm here to help you find what you're looking for.</p>
                                <div className="space-y-2">
                                    {STARTER_PROMPTS.map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => send(p)}
                                            disabled={sending}
                                            className="block w-full text-left px-3 py-2 text-[12px] bg-white border border-gray-200 hover:border-[#C6A35E] hover:text-[#C6A35E] rounded-md transition-colors"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                                <div
                                    className={
                                        m.role === 'user'
                                            ? 'max-w-[85%] bg-[#1A1A1A] text-white text-sm rounded-2xl rounded-br-sm px-3 py-2'
                                            : `max-w-[90%] text-sm text-[#1A1A1A] ${m.error ? 'text-red-500' : ''}`
                                    }
                                >
                                    {m.role === 'user' ? (
                                        <span>{m.content}</span>
                                    ) : (
                                        renderMessageBody(m.content)
                                    )}
                                </div>
                            </div>
                        ))}

                        {sending && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-400">
                                    <span className="inline-flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-[#C6A35E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-[#C6A35E] rounded-full animate-bounce" style={{ animationDelay: '120ms' }} />
                                        <span className="w-1.5 h-1.5 bg-[#C6A35E] rounded-full animate-bounce" style={{ animationDelay: '240ms' }} />
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="border-t border-gray-100 px-3 py-2 flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={sending ? 'Thinking…' : 'Ask me anything…'}
                            disabled={sending}
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-[#C6A35E] focus:border-[#C6A35E] disabled:bg-gray-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || sending}
                            className="w-9 h-9 flex items-center justify-center bg-[#C6A35E] text-white rounded-full hover:bg-[#1A1A1A] disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
                            aria-label="Send"
                        >
                            <PaperAirplaneIcon className="h-4 w-4" />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default AIAssistant;
