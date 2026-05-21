import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { getProductById } from '../../api/axios';
import { useCart } from '../../context/CartContext';

// Module-level cache so the same product isn't fetched 5 times across messages.
const cache = new Map();

const ProductCard = ({ productId }) => {
    const { addToCart } = useCart();
    const [product, setProduct] = useState(cache.get(productId) || null);
    const [error, setError] = useState(false);
    const [added, setAdded] = useState(false);

    useEffect(() => {
        if (cache.has(productId)) {
            setProduct(cache.get(productId));
            return;
        }
        let cancelled = false;
        getProductById(productId)
            .then((res) => {
                if (cancelled) return;
                cache.set(productId, res.data);
                setProduct(res.data);
            })
            .catch(() => !cancelled && setError(true));
        return () => { cancelled = true; };
    }, [productId]);

    if (error) {
        return (
            <span className="inline-block text-[11px] text-red-400 italic">
                product #{productId} unavailable
            </span>
        );
    }

    if (!product) {
        return (
            <span className="inline-flex items-center my-1 bg-gray-100 rounded-md px-2 py-1 text-[11px] text-gray-400 animate-pulse">
                loading product…
            </span>
        );
    }

    const handleAdd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart({ ...product, price: Number(product.price) });
        setAdded(true);
        setTimeout(() => setAdded(false), 1800);
    };

    return (
        <div className="my-2 flex items-center gap-2 bg-[#F8F7F4] border border-[#C6A35E]/20 rounded-md p-2 not-prose">
            <Link
                to={`/product/${product.id}`}
                className="w-10 h-10 bg-white rounded-sm overflow-hidden flex-shrink-0 border border-gray-100"
            >
                {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : null}
            </Link>
            <div className="flex-1 min-w-0">
                <Link to={`/product/${product.id}`} className="block text-[12px] font-medium text-[#1A1A1A] truncate hover:text-[#C6A35E]">
                    {product.name}
                </Link>
                <div className="text-[10px] text-gray-400 truncate">{product.vendor_name || '—'}</div>
            </div>
            <div className="text-[12px] font-medium text-[#C6A35E] flex-shrink-0 px-1">
                ${Number(product.price).toFixed(2)}
            </div>
            <button
                onClick={handleAdd}
                disabled={product.stock_quantity === 0}
                className={`flex-shrink-0 text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border transition-colors ${
                    product.stock_quantity === 0
                        ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                        : added
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-[#C6A35E] text-[#C6A35E] hover:bg-[#C6A35E] hover:text-white'
                }`}
                title={product.stock_quantity === 0 ? 'Out of stock' : 'Add to cart'}
            >
                {product.stock_quantity === 0 ? 'OOS' : added ? '✓ Added' : <ShoppingBagIcon className="h-3 w-3 inline" />}
            </button>
        </div>
    );
};

export default ProductCard;
