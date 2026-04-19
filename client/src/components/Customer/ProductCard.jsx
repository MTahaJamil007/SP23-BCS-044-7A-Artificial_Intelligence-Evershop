import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { ShoppingBagIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const ProductCard = ({ product, addToCart }) => {
    const navigate = useNavigate();
    const [inWishlist, setInWishlist] = useState(false);
    const [loadingWishlist, setLoadingWishlist] = useState(false);

    // Initial check for wishlist status
    useEffect(() => {
        const checkWishlistStatus = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                const response = await fetch(`http://localhost:5001/api/social/in-wishlist/${product.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setInWishlist(data.inWishlist);
                }
            } catch (err) {
                console.error("Failed to check wishlist status", err);
            }
        };
        checkWishlistStatus();
    }, [product.id]);

    const handleWishlistToggle = async (e) => {
        e.preventDefault(); // Prevent Link navigation
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        setLoadingWishlist(true);
        try {
            const response = await fetch(`http://localhost:5001/api/social/wishlist/${product.id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setInWishlist(!inWishlist);
            }
        } catch (err) {
            console.error("Failed to toggle wishlist", err);
        } finally {
            setLoadingWishlist(false);
        }
    };

    // Generate star rating based on ID for consistency in mock/demo
    const rating = product.rating || (product.id % 2) + 3.5;
    const reviewCount = product.reviews || ((product.id * 17) % 500) + 12;

    return (
        <div className="group relative bg-white flex flex-col h-full rounded-sm hover:shadow-2xl transition-all duration-500 ease-out border border-transparent hover:border-[#F8F7F4]">
            {/* Image Area */}
            <div className="relative aspect-[4/5] bg-[#F8F7F4] overflow-hidden">
                <Link to={`/product/${product.id}`} className="block w-full h-full">
                    {product.image_url ? (
                        <img
                            src={product.image_url.startsWith('http') ? product.image_url : `http://localhost:5001/${product.image_url}`}
                            alt={product.name}
                            className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700 ease-in-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 font-serif text-3xl">No Image</div>
                    )}
                </Link>

                {/* Wishlist Button */}
                <button
                    onClick={handleWishlistToggle}
                    disabled={loadingWishlist}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white text-gray-900 shadow-sm transition-all z-10 opacity-0 group-hover:opacity-100 transform translate-y-[-10px] group-hover:translate-y-0 duration-300"
                >
                    {inWishlist ? (
                        <HeartIconSolid className="h-5 w-5 text-red-600 animate-scale-in" />
                    ) : (
                        <HeartIcon className="h-5 w-5 hover:text-[#C6A35E] transition-colors" />
                    )}
                </button>

                {/* Quick Add Button / Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            addToCart(product);
                        }}
                        className="w-full bg-[#1A1A1A] text-white py-3 uppercase tracking-widest text-xs font-bold hover:bg-[#C6A35E] transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        <ShoppingBagIcon className="h-4 w-4" /> Add to Cart
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <Link to={`/product/${product.id}`} className="flex-grow flex flex-col p-5 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#C6A35E] mb-2 font-bold">{product.category}</div>
                <h3 className="font-serif text-[#1A1A1A] text-lg leading-tight mb-2 group-hover:text-[#C6A35E] transition-colors font-medium">
                    {product.name}
                </h3>
                
                {/* Rating */}
                <div className="flex items-center justify-center space-x-1 mb-3 opacity-60">
                    {[...Array(5)].map((_, i) => (
                        <StarIcon 
                            key={i} 
                            className={`h-3 w-3 ${i < Math.floor(rating) ? 'text-[#C6A35E]' : 'text-gray-200'}`} 
                        />
                    ))}
                    <span className="text-xs text-gray-400">({reviewCount})</span>
                </div>

                <div className="mt-auto">
                    <span className="text-xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                        ${Math.floor(product.price)}<span className="text-xs align-top font-sans text-gray-500">{product.price.toString().split('.')[1] || '00'}</span>
                    </span>
                </div>
            </Link>
        </div>
    );
};

export default ProductCard;
