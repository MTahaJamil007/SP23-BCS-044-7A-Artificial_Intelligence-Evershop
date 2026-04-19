import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCardLuxury from './ProductCardLuxury'; // Updates to Luxury Card
import FilterSidebar from './FilterSidebar';
import { useCart } from '../../context/CartContext';
import { getAllProducts } from '../../api/axios';
import { FunnelIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';

const SearchPage = () => {
    const { addToCart } = useCart();
    const [searchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters State
    const [filters, setFilters] = useState({
        categories: [],
        priceRange: [0, 5000],
        rating: 0,
        query: initialQuery
    });
    
    // Update filters if URL query changes
    useEffect(() => {
        setFilters(prev => ({ ...prev, query: searchParams.get('q') || '' }));
    }, [searchParams]);

    const [sortBy, setSortBy] = useState('featured');

    // Fetch Real Products
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await getAllProducts();
                setProducts(res.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch products", err);
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    // Derived Logic
    const filteredProducts = useMemo(() => {
        return products.filter(product => {
            // Search Query Match
            if (filters.query) {
                const q = filters.query.toLowerCase();
                const matchName = product.name?.toLowerCase().includes(q);
                const matchDesc = product.description?.toLowerCase().includes(q);
                const matchCat = product.category?.toLowerCase().includes(q);
                if (!matchName && !matchDesc && !matchCat) return false;
            }

            // Category Match
            if (filters.categories.length > 0 && !filters.categories.includes(product.category)) return false;
            // Price Match
            const price = parseFloat(product.price);
            if (price < filters.priceRange[0] || price > filters.priceRange[1]) return false;
            // Rating Match
            const rating = product.rating || (product.id % 2) + 3.5;
            if (rating < filters.rating) return false;
            
            return true;
        }).sort((a, b) => {
            const priceA = parseFloat(a.price);
            const priceB = parseFloat(b.price);
            const ratingA = a.rating || (a.id % 2) + 3.5;
            const ratingB = b.rating || (b.id % 2) + 3.5;

            if (sortBy === 'price_asc') return priceA - priceB;
            if (sortBy === 'price_desc') return priceB - priceA;
            if (sortBy === 'rating') return ratingB - ratingA;
            return 0; // featured
        });
    }, [products, filters, sortBy]);

    const activeFilterCount = filters.categories.length + (filters.rating > 0 ? 1 : 0) + (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000 ? 1 : 0) + (filters.query ? 1 : 0);
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    const clearFilters = () => {
        setFilters({ categories: [], priceRange: [0, 5000], rating: 0, query: '' });
    };

    if (loading) return (
        <div className="min-h-screen bg-[#F8F7F4] flex justify-center items-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C6A35E]"></div>
        </div>
    );

    return (
        <div className="bg-[#F8F7F4] min-h-screen pt-20"> {/* Added pt-20 for fixed navbar */}
            <div className="max-w-screen-2xl mx-auto flex">
                
                {/* Sidebar */}
                <FilterSidebar 
                    filters={filters} 
                    setFilters={setFilters} 
                    categories={categories}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                {/* Main Content */}
                <main className="flex-1 px-4 sm:px-6 lg:px-12 py-8 w-full">
                    
                    {/* Header / Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-6 border-b border-gray-200 gap-6">
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-[#1A1A1A]">
                                {filters.query ? `Results for "${filters.query}"` : 'All Products'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-2 font-sans">
                                Showing {filteredProducts.length} of {products.length} items
                            </p>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Mobile Filter Toggle */}
                            <button 
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden flex items-center px-4 py-2 bg-white border border-gray-200 rounded-sm text-sm font-medium hover:bg-gray-50 text-gray-700 font-sans tracking-wide uppercase"
                            >
                                <FunnelIcon className="h-4 w-4 mr-2" />
                                Filters
                            </button>

                            {/* Sort Dropdown - Minimalist */}
                            <div className="relative group min-w-[180px]">
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none w-full bg-transparent border-b border-gray-300 py-2 pr-8 text-sm font-medium text-[#1A1A1A] focus:outline-none focus:border-[#C6A35E] cursor-pointer font-sans"
                                >
                                    <option value="featured">Sort by: Featured</option>
                                    <option value="price_asc">Price: Low to High</option>
                                    <option value="price_desc">Price: High to Low</option>
                                    <option value="rating">Avg. Review</option>
                                </select>
                                <ArrowsUpDownIcon className="h-4 w-4 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Product Grid - Spacious */}
                    {filteredProducts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-8 gap-y-12">
                            {filteredProducts.map(product => (
                                <ProductCardLuxury key={product.id} product={product} addToCart={addToCart} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 rounded-sm border border-gray-200 border-dashed bg-white/50">
                             <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <FunnelIcon className="h-8 w-8 text-gray-400" />
                             </div>
                             <h3 className="text-xl font-serif text-[#1A1A1A]">No matches found</h3>
                             <p className="text-gray-500 max-w-sm text-center mt-3 font-sans">
                                We couldn't find any products matching your search.
                             </p>
                             <button 
                                onClick={clearFilters}
                                className="mt-8 text-[#C6A35E] font-bold text-sm tracking-widest uppercase hover:text-[#b08d4b] border-b border-[#C6A35E] pb-1"
                             >
                                Reset Filters
                             </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SearchPage;
