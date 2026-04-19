import React, { useState, useEffect } from 'react';
import { getAllProducts } from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { StarIcon } from '@heroicons/react/24/solid';

const ProductGrid = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { addToCart } = useCart();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await getAllProducts();
                setProducts(response.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Could not load products. Is the server running?');
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Helper for stars (random for now as schema doesn't have ratings)
    const renderStars = (id) => {
        // Deterministic pseudo-random based on ID
        const rating = (id % 2) + 3.5; // Starts at 3.5 to 5
        return (
            <div className="flex items-center space-x-0.5 mb-1">
                {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className={`h-4 w-4 ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`} />
                ))}
                <span className="text-xs text-blue-600 ml-1 hover:underline cursor-pointer">
                    {((id * 17) % 500) + 12}
                </span>
            </div>
        );
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
        </div>
    );

    if (error) return (
        <div className="text-center p-10 bg-red-50 text-red-600 rounded-lg mx-4 mt-8">
            {error}
        </div>
    );

    return (
        <div className="bg-gray-100 min-h-screen">
            {/* Hero Section */}
            <div className="relative w-full bg-gray-900 h-64 md:h-96 overflow-hidden">
                <img 
                    src="http://localhost:5001/uploads/hero_banner.png" 
                    alt="Premium Tech" 
                    className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-100 via-transparent to-transparent"></div>
            </div>

            {/* Product Grid Content - Overlapping Hero */}
            <div className="container mx-auto px-4 -mt-20 md:-mt-32 relative z-10 pb-12">
                <h2 className="text-2xl font-bold mb-6 px-2 text-gray-800 bg-white/80 inline-block backdrop-blur-sm rounded-md shadow-sm">Featured Products</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.length > 0 ? (
                        products.map((product) => (
                            <div key={product.id} className="bg-white flex flex-col h-full p-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                                {/* Image */}
                                <div className="h-48 md:h-56 flex items-center justify-center bg-gray-50 mb-4 overflow-hidden relative">
                                    {product.image_url ? (
                                        <img
                                            src={`http://localhost:5001/${product.image_url}`} 
                                            alt={product.name}
                                            className="max-h-full max-w-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <span className="text-gray-400 text-sm">No Image</span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-grow flex flex-col">
                                    <h3 className="text-gray-900 font-medium leading-tight mb-1 line-clamp-2 hover:text-blue-600 hover:underline">
                                        {product.name}
                                    </h3>
                                    
                                    {/* Rating */}
                                    {renderStars(product.id)}

                                    {/* Price */}
                                    <div className="mt-1">
                                        <span className="text-xs align-top">$</span>
                                        <span className="text-2xl font-bold text-gray-900">{Math.floor(product.price)}</span>
                                        <span className="text-xs align-top">{product.price.toString().split('.')[1] || '00'}</span>
                                    </div>

                                    {/* Vendor Badge */}
                                    <p className="text-xs text-gray-500 mb-2">
                                        Sold by <span className="text-blue-500 hover:underline">{product.vendor_name || 'EverShop Supply'}</span>
                                    </p>

                                    {/* Add to Cart */}
                                    <div className="mt-auto pt-2">
                                        <button
                                            onClick={() => addToCart(product)}
                                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-medium py-1.5 rounded-full shadow-sm transition-colors focus:ring-2 focus:ring-yellow-600 focus:outline-none"
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full h-64 flex flex-col items-center justify-center bg-white rounded-lg shadow-sm">
                            <p className="text-gray-500 mb-2">No products found.</p>
                            <Link to="/vendor/add-product" className="text-blue-600 hover:underline text-sm font-medium">Are you a vendor? Add products here.</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductGrid;
