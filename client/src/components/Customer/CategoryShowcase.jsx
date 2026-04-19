import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const CATEGORIES = [
    { 
        id: 'fashion',
        name: 'Haute Couture', 
        image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop',
        colSpan: 'md:col-span-2 lg:col-span-2',
        description: 'The season\'s most coveted looks.'
    },
    { 
        id: 'electronics',
        name: 'Tech & Audio', 
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop',
        colSpan: 'md:col-span-1 lg:col-span-1',
        description: 'Innovation meets design.'
    },
    { 
        id: 'watches',
        name: 'Timepieces', 
        image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=2069&auto=format&fit=crop',
        colSpan: 'md:col-span-1 lg:col-span-1',
        description: 'Precision engineering.'
    },
    { 
        id: 'home',
        name: 'Interior Art', 
        image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=2073&auto=format&fit=crop',
        colSpan: 'md:col-span-2 lg:col-span-2',
        description: 'Curated spaces for living.'
    }
];

const CategoryShowcase = () => {
    const navigate = useNavigate();

    return (
        <section className="py-24 bg-[#F8F7F4]">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 px-2">
                    <div className="max-w-xl">
                        <span className="text-[#C6A35E] font-bold uppercase tracking-[0.2em] text-xs mb-4 block">Curated Collections</span>
                        <h2 className="text-4xl md:text-5xl font-serif text-[#1A1A1A] leading-tight">
                            Shop by Category
                        </h2>
                    </div>
                    <button onClick={() => navigate('/search')} className="hidden md:flex items-center gap-2 text-[#1A1A1A] border-b border-[#1A1A1A] pb-1 hover:text-[#C6A35E] hover:border-[#C6A35E] transition-all uppercase tracking-widest text-xs font-bold">
                        View All Collections <ArrowRightIcon className="h-4 w-4" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6">
                    {CATEGORIES.map((cat, idx) => (
                        <div 
                            key={cat.id}
                            onClick={() => navigate(cat.id === 'fashion' || cat.id === 'electronics' ? `/category/${cat.id}` : '/search')}
                            className={`group relative h-[400px] cursor-pointer overflow-hidden rounded-sm ${cat.colSpan}`}
                        >
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors z-10" />
                            <img 
                                src={cat.image} 
                                alt={cat.name} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            
                            <div className="absolute inset-0 z-20 flex flex-col justify-end p-8 md:p-10">
                                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <h3 className="text-3xl font-serif text-white mb-2 italic">{cat.name}</h3>
                                    <p className="text-white/80 text-sm font-light mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                        {cat.description}
                                    </p>
                                    <span className="inline-flex items-center text-white text-xs font-bold uppercase tracking-widest border-b border-white pb-1 group-hover:border-[#C6A35E] group-hover:text-[#C6A35E] transition-colors">
                                        Explore <ArrowRightIcon className="h-3 w-3 ml-2" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-12 text-center md:hidden">
                     <button onClick={() => navigate('/search')} className="inline-flex items-center gap-2 text-[#1A1A1A] border-b border-[#1A1A1A] pb-1 uppercase tracking-widest text-xs font-bold">
                        View All Collections <ArrowRightIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </section>
    );
};

export default CategoryShowcase;
