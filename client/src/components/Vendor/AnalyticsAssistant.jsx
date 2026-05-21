import React, { useState } from 'react';
import { askVendorAnalytics } from '../../api/axios';
import { SparklesIcon } from '@heroicons/react/24/outline';

const SUGGESTIONS = [
    'Show me my low stock items',
    'Top sellers in the last 30 days',
    'Revenue by category this month',
    'Products that have never sold',
];

const COLUMN_LABELS = {
    id: 'ID',
    name: 'Product',
    category: 'Category',
    price: 'Price',
    stock_quantity: 'Stock',
    units_sold: 'Units',
    revenue: 'Revenue',
    orders: 'Orders',
    units: 'Units',
    day: 'Date',
    created_at: 'Added',
};

function formatCell(col, v) {
    if (v == null) return '—';
    if (col === 'price' || col === 'revenue') return `$${Number(v).toFixed(2)}`;
    if (col === 'created_at' || col === 'day') return new Date(v).toLocaleDateString();
    return String(v);
}

const AnalyticsAssistant = () => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [errMsg, setErrMsg] = useState(null);

    const ask = async (q) => {
        const text = (q ?? question).trim();
        if (!text || loading) return;
        setLoading(true);
        setErrMsg(null);
        setResult(null);
        try {
            const { data } = await askVendorAnalytics(text);
            setResult(data);
        } catch (err) {
            setErrMsg(err.response?.data?.error || 'Failed to get an answer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        ask();
    };

    const rows = result?.data?.rows ?? [];
    const columns = rows[0] ? Object.keys(rows[0]) : [];

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <SparklesIcon className="h-5 w-5 text-[#C6A35E]" />
                <h3 className="font-serif text-lg text-[#1A1A1A]">AI Analytics Assistant</h3>
                <span className="text-[10px] uppercase tracking-widest text-gray-400 ml-auto">Vendor-only</span>
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 mb-3">
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about stock, top sellers, revenue…"
                    disabled={loading}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#C6A35E] focus:border-[#C6A35E]"
                />
                <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className="px-4 py-2 bg-[#1A1A1A] text-white text-xs uppercase tracking-widest rounded-md hover:bg-[#C6A35E] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? '…' : 'Ask'}
                </button>
            </form>

            {!result && !loading && !errMsg && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {SUGGESTIONS.map((s) => (
                        <button
                            key={s}
                            onClick={() => { setQuestion(s); ask(s); }}
                            className="text-[11px] px-2 py-1 border border-gray-200 rounded-full hover:border-[#C6A35E] hover:text-[#C6A35E] transition-colors"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {errMsg && (
                <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2">
                    {errMsg}
                </div>
            )}

            {result && (
                <div className="mt-3">
                    {result.tool && (
                        <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
                            via {result.tool}
                        </div>
                    )}
                    {result.summary && (
                        <p className="text-sm text-[#1A1A1A] mb-3 italic">
                            {result.summary}
                        </p>
                    )}
                    {rows.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left border-b border-gray-200">
                                        {columns.map((c) => (
                                            <th key={c} className="py-2 px-2 font-medium text-gray-500 uppercase tracking-wider text-[10px]">
                                                {COLUMN_LABELS[c] || c}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.slice(0, 12).map((row, i) => (
                                        <tr key={i} className="border-b border-gray-50 hover:bg-[#F8F7F4]">
                                            {columns.map((c) => (
                                                <td key={c} className="py-2 px-2 text-[#1A1A1A]">
                                                    {formatCell(c, row[c])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {rows.length > 12 && (
                                <p className="text-[10px] text-gray-400 mt-2 text-center">
                                    Showing 12 of {rows.length} rows.
                                </p>
                            )}
                        </div>
                    ) : (
                        !errMsg && (
                            <p className="text-sm text-gray-500 italic">No data returned.</p>
                        )
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticsAssistant;
