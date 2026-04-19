import React from 'react';
import { useNavigate } from 'react-router-dom';

const ProductCardLuxury = ({ product, addToCart }) => {
    const navigate = useNavigate();

    const handleNavigate = () => {
        navigate(`/product/${product.id}`);
    };

    return (
        <div className="group relative flex flex-col h-full bg-white">
            {/* Image Container - Borderless, Clean */}
            <div 
                onClick={handleNavigate}
                className="relative aspect-[4/5] overflow-hidden bg-gray-100 mb-4 cursor-pointer"
            >
                <img
                    src={product.image_url ? 
                        (product.image_url.startsWith('http') ? product.image_url : `http://localhost:5001/${product.image_url}`) 
                        : "https://via.placeholder.com/400x500"}
                    alt={product.name}
                    className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
                
                {/* Minimalist 'Add to Cart' - Slides up on hover */}
                <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out bg-gradient-to-t from-black/20 to-transparent backdrop-blur-[1px]">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                        }}
                        className="w-full bg-[#C6A35E] text-white py-3 px-4 text-xs font-bold tracking-widest uppercase hover:bg-[#b08d4b] transition-colors shadow-lg"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="flex flex-col space-y-1">
                <h3 
                    onClick={handleNavigate}
                    className="text-base font-serif text-[#1A1A1A] group-hover:text-[#C6A35E] transition-colors cursor-pointer line-clamp-1"
                >
                    {product.name}
                </h3>
                <p className="text-xs text-gray-400 tracking-wide uppercase">
                    {product.vendor_name || 'EverShop Collection'}
                </p>
                <div className="pt-1">
                    <span className="text-sm font-medium text-[#1A1A1A]">
                        ${Math.floor(product.price)}
                    </span>
                    {product.price.toString().split('.')[1] && (
                        <span className="text-xs align-top text-gray-500 ml-0.5">.{product.price.toString().split('.')[1]}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductCardLuxury;
