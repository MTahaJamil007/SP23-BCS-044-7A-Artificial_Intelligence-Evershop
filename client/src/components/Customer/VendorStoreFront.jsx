import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard'; 
import { useCart } from '../../context/CartContext';
import { MagnifyingGlassIcon, StarIcon, CheckBadgeIcon } from '@heroicons/react/24/solid';

const VendorStoreFront = () => {
    const { vendorId } = useParams();
    const { addToCart } = useCart();
    const [storeData, setStoreData] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const [searchQuery, setSearchQuery] = useState('');

    const [isFollowing, setIsFollowing] = useState(false);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/storefront/${vendorId}`);
                if (res.ok) {
                    const data = await res.json();
                    setStoreData(data.profile);
                    setProducts(data.products);
                }
            } catch (err) {
                console.error("Failed to load store", err);
            } finally {
                setLoading(false);
            }
        };

        const checkFollowStatus = async () => {
            if (!token) return;
            try {
                const res = await fetch(`http://localhost:5001/api/social/is-following/${vendorId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setIsFollowing(data.following);
                }
            } catch (err) {
                console.error("Failed to check status", err);
            }
        };

        fetchStore();
        checkFollowStatus();
    }, [vendorId, token]);

    const handleFollow = async () => {
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const res = await fetch(`http://localhost:5001/api/social/follow/${vendorId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIsFollowing(data.following);
            }
        } catch (err) {
            alert("Failed to update follow status");
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-[#1A1A1A] font-serif">Loading Boutique...</div>;
    if (!storeData) return <div className="h-screen flex items-center justify-center text-red-500">Store Not Found</div>;

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getImageUrl = (path) => {
        if (!path) return "https://via.placeholder.com/150";
        if (path.startsWith('http')) return path;
        return `http://localhost:5001/${path}`;
    };

    return (
        <div className="bg-white min-h-screen font-sans">
            {/* 1. Store Header (Billboard) */}
            <div className="relative">
                {/* Cover Image */}
                <div className="h-64 md:h-80 w-full overflow-hidden">
                    <img 
                        src={getImageUrl(storeData.store_banner_url) === "https://via.placeholder.com/150" ? "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" : getImageUrl(storeData.store_banner_url)} 
                        alt="Store Cover" 
                        className="w-full h-full object-cover filter brightness-75"
                    />
                </div>

                {/* Vendor Info Bar - Overlapping */}
                <div className="container mx-auto px-4 relative -mt-16 z-10">
                    <div className="bg-white/95 backdrop-blur-sm shadow-xl rounded-lg p-6 flex flex-col md:flex-row items-center md:items-end gap-6 border border-gray-100">
                        {/* Logo */}
                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white -mt-20 md:-mt-0 md:absolute md:-top-16 md:left-8">
                            <img 
                                src={getImageUrl(storeData.store_logo_url)} 
                                alt={storeData.name} 
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Text Info */}
                        <div className="md:ml-40 flex-1 text-center md:text-left mt-10 md:mt-0">
                            <h1 className="text-4xl font-serif font-bold text-[#1A1A1A] mb-2">{storeData.name}</h1>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-600 mb-4">
                                <span className="flex items-center gap-1">
                                    <StarIcon className="h-4 w-4 text-[#C6A35E]" />
                                    {storeData.stats.rating} Rating ({storeData.stats.reviewCount})
                                </span>
                                <span className="flex items-center gap-1">
                                    <CheckBadgeIcon className="h-4 w-4 text-blue-500" />
                                    {storeData.stats.itemsSold}+ Items Sold
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button 
                                onClick={handleFollow}
                                className={`px-6 py-2 border-2 font-bold uppercase tracking-widest text-xs transition-all rounded-sm ${
                                    isFollowing 
                                    ? 'bg-[#C6A35E] border-[#C6A35E] text-white' 
                                    : 'border-[#C6A35E] text-[#C6A35E] hover:bg-[#C6A35E] hover:text-white'
                                }`}
                            >
                                {isFollowing ? 'Following' : 'Follow Store'}
                            </button>
                            <button className="px-6 py-2 bg-[#1A1A1A] text-white font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all rounded-sm">
                                Contact
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Sticky Navigation */}
            <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm mt-8">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center h-auto md:h-16 py-4 md:py-0 gap-4">
                        {/* Nav Links */}
                        <nav className="flex space-x-8 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                            {['home', 'products', 'about', 'reviews'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`text-sm font-bold uppercase tracking-widest whitespace-nowrap pb-1 border-b-2 transition-colors ${
                                        activeTab === tab 
                                        ? 'border-[#C6A35E] text-[#1A1A1A]' 
                                        : 'border-transparent text-gray-500 hover:text-[#C6A35E]'
                                    }`}
                                >
                                    {tab === 'products' ? 'All Products' : tab}
                                </button>
                            ))}
                        </nav>

                        {/* In-Store Search */}
                        <div className="relative w-full md:w-64">
                            <input 
                                type="text" 
                                placeholder="Search in store..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-[#C6A35E] transition-colors"
                            />
                            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Content Area */}
            <div className="container mx-auto px-4 py-12">
                {activeTab === 'home' || activeTab === 'products' ? (
                    <>
                         {activeTab === 'home' && (
                             <div className="mb-12 text-center max-w-2xl mx-auto">
                                 <h2 className="text-2xl font-serif text-[#1A1A1A] mb-4">Curated Collection</h2>
                                 <p className="text-gray-500 italic">"Explicitly designed for the modern connoisseur. Discover our latest arrivals."</p>
                             </div>
                         )}

                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => (
                                    <ProductCard key={product.id} product={product} addToCart={addToCart} />
                                ))
                            ) : (
                                <div className="col-span-full text-center py-20 text-gray-400">
                                    No products found matching your search.
                                </div>
                            )}
                        </div>
                    </>
                ) : activeTab === 'about' ? (
                    <div className="max-w-3xl mx-auto bg-gray-50 p-12 rounded-lg text-center">
                        <h2 className="text-3xl font-serif text-[#1A1A1A] mb-8">About {storeData.name}</h2>
                        <div className="w-16 h-1 bg-[#C6A35E] mx-auto mb-8"></div>
                        <p className="text-gray-600 leading-relaxed text-lg">
                            {storeData.store_description || "We are a premium boutique dedicated to bringing you the finest selection of luxury goods. Our commitment to quality and craftsmanship is unwavering."}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto text-center py-20">
                        <h3 className="text-xl font-serif text-gray-400">Store Reviews Coming Soon</h3>
                        <p className="text-gray-500 mt-2">See individual products for item-specific reviews.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorStoreFront;
