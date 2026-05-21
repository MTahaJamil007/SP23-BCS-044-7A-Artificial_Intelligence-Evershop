import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRelatedProducts } from '../../api/axios';

const RelatedProducts = ({ productId }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) return;
        setLoading(true);
        let cancelled = false;
        getRelatedProducts(productId)
            .then((res) => { if (!cancelled) setItems(res.data?.related ?? []); })
            .catch(() => { if (!cancelled) setItems([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [productId]);

    if (loading) {
        return (
            <section className="container mx-auto px-6 py-8">
                <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-4" />
                <div className="flex gap-4 overflow-x-auto">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-48 h-64 bg-gray-100 rounded-md animate-pulse" />
                    ))}
                </div>
            </section>
        );
    }

    if (items.length === 0) return null;

    return (
        <section className="container mx-auto px-6 py-10 border-t border-gray-100">
            <div className="flex items-baseline justify-between mb-5">
                <h3 className="font-serif text-2xl text-[#1A1A1A]">You may also like</h3>
                <span className="text-[10px] uppercase tracking-widest text-[#C6A35E]">AI Recommended</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
                {items.map((p) => (
                    <Link
                        key={p.id}
                        to={`/product/${p.id}`}
                        className="flex-shrink-0 w-48 group"
                    >
                        <div className="w-48 h-48 bg-[#F8F7F4] rounded-md overflow-hidden mb-2">
                            {p.image_url ? (
                                <img
                                    src={p.image_url}
                                    alt={p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : null}
                        </div>
                        <p className="text-xs font-sans text-[#1A1A1A] truncate group-hover:text-[#C6A35E]">{p.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{p.vendor_name}</p>
                        <p className="text-xs font-medium text-[#C6A35E] mt-1">${Number(p.price).toFixed(2)}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default RelatedProducts;
