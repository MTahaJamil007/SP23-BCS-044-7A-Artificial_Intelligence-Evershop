import React, { useEffect, useState } from 'react';
import HeroCarousel from './HeroCarousel';
import CategoryShowcase from './CategoryShowcase';
import ProductCard from './ProductCard';
import { getAllProducts } from '../../api/axios';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import ServicePromise from './ServicePromise';
import ProductCardSkeleton from '../Common/ProductCardSkeleton';
import EmptyState from '../Common/EmptyState';

const HomePage = () => {
    const { addToCart } = useCart();
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await getAllProducts();
                // Just take first 8 for home page
                setFeaturedProducts(res.data.slice(0, 8)); 
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    return (
        <div className="min-h-screen bg-white">
            {/* 1. Hero */}
            <HeroCarousel />

            {/* 2. Service Promise */}
            <ServicePromise />

            {/* 3. Categories */}
            <CategoryShowcase />

            {/* 4. Featured Products */}
            <section className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900">Trending Now</h2>
                            <p className="text-gray-500 mt-2">Top picks for you this week</p>
                        </div>
                        <Link to="/search" className="text-blue-600 font-semibold hover:text-blue-800 hover:underline">
                            View All Products &rarr;
                        </Link>
                    </div>

                    {loading ? (
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => (
                                <ProductCardSkeleton key={i} />
                            ))}
                         </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {featuredProducts.length > 0 ? (
                                featuredProducts.map(product => (
                                    <ProductCard key={product.id} product={product} addToCart={addToCart} />
                                ))
                            ) : (
                                <div className="col-span-full">
                                    <EmptyState 
                                        title="No Collections Found" 
                                        description="We are currently curating our exclusive featured collection. Please check back shortly." 
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* 5. Newsletter */}
            <section className="py-20 bg-indigo-900 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl font-bold mb-4">Subscribe to our Newsletter</h2>
                    <p className="text-indigo-200 mb-8 max-w-2xl mx-auto">
                        Get the latest updates on new products and upcoming sales.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center max-w-md mx-auto gap-4">
                        <input 
                            type="email" 
                            placeholder="Your email address" 
                            className="px-6 py-3 rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-yellow-400 w-full"
                        />
                        <button className="px-8 py-3 bg-yellow-400 text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-colors shadow-lg">
                            Subscribe
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
