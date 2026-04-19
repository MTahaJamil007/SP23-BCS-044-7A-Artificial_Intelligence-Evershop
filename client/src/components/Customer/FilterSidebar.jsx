import React from 'react';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/solid';

const FilterSidebar = ({ filters, setFilters, categories, isOpen, onClose }) => {
    const handleCategoryChange = (category) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        setFilters({ ...filters, categories: newCategories });
    };

    return (
        <>
        {/* Mobile Overlay */}
        <div 
            className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        />

        {/* Sidebar */}
        <div className={`
            fixed top-0 left-0 bottom-0 w-80 bg-white z-50 transform transition-transform duration-300 shadow-2xl overflow-y-auto
            lg:relative lg:transform-none lg:w-64 lg:shadow-none lg:z-0 lg:block lg:h-auto
            ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
            <div className="p-5">
                <div className="flex justify-between items-center lg:hidden mb-4">
                    <h2 className="text-lg font-bold">Filters</h2>
                    <button onClick={onClose}><XMarkIcon className="h-6 w-6 text-gray-500" /></button>
                </div>

                {/* Categories */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Categories</h3>
                    <div className="space-y-2.5">
                        {categories.map(category => (
                            <label key={category} className="flex items-center space-x-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="peer hover:border-blue-500 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition duration-150 ease-in-out"
                                        checked={filters.categories.includes(category)}
                                        onChange={() => handleCategoryChange(category)}
                                    />
                                </div>
                                <span className={`text-sm group-hover:text-blue-600 transition-colors ${filters.categories.includes(category) ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                                    {category}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Price Range */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Price Range</h3>
                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500 text-xs">$</span>
                            <input
                                type="number"
                                className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                value={filters.priceRange[0]}
                                onChange={(e) => setFilters({ ...filters, priceRange: [Number(e.target.value), filters.priceRange[1]] })}
                                placeholder="Min"
                            />
                        </div>
                        <span className="text-gray-400">-</span>
                        <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-500 text-xs">$</span>
                            <input
                                type="number"
                                className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                value={filters.priceRange[1]}
                                onChange={(e) => setFilters({ ...filters, priceRange: [filters.priceRange[0], Number(e.target.value)] })}
                                placeholder="Max"
                            />
                        </div>
                    </div>
                </div>

                {/* Customer Rating */}
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Avg. Review</h3>
                    <div className="space-y-2">
                        {[4, 3, 2, 1].map(star => (
                            <div 
                                key={star} 
                                className={`flex items-center cursor-pointer p-1 rounded transition-colors ${filters.rating === star ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
                                onClick={() => setFilters({ ...filters, rating: filters.rating === star ? 0 : star })}
                            >
                                <div className="flex text-yellow-400 mr-2">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} className={`h-4 w-4 ${i < star ? 'text-yellow-400' : 'text-gray-300'}`} />
                                    ))}
                                </div>
                                <span className="text-sm text-gray-600">& Up</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        </>
    );
};

export default FilterSidebar;
