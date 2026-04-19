import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, StarIcon } from '@heroicons/react/24/solid';

const FashionPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const collections = [
        { name: "Summer '25", image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=2070&auto=format&fit=crop" },
        { name: "Evening Wear", image: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=2083&auto=format&fit=crop" },
        { name: "Street Luxury", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop" }
    ];

    return (
        <div className="bg-[#F8F7F4] min-h-screen font-serif">
            {/* Hero Section */}
            <div className="relative h-[80vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-black/30 z-10" />
                <img 
                    src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop" 
                    className="w-full h-full object-cover"
                    alt="Fashion Hero"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center text-white p-6">
                    <span className="uppercase tracking-[0.3em] text-sm md:text-base mb-6 animate-fade-in-up">Evershop Atelier</span>
                    <h1 className="text-6xl md:text-8xl font-serif mb-8 italic animate-fade-in-up delay-100">
                        Haute Couture
                    </h1>
                    <button 
                        onClick={() => navigate('/search?category=Fashion')}
                        className="bg-white text-[#1A1A1A] px-10 py-4 uppercase tracking-widest text-xs font-bold hover:bg-[#C6A35E] hover:text-white transition-colors animate-fade-in-up delay-200"
                    >
                        View Collection
                    </button>
                </div>
            </div>

            {/* Featured Collections */}
            <div className="container mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif text-[#1A1A1A] mb-4">The Collections</h2>
                    <div className="w-24 h-1 bg-[#C6A35E] mx-auto" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {collections.map((col, idx) => (
                        <div key={idx} className="group cursor-pointer">
                            <div className="relative h-[500px] overflow-hidden mb-6">
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
                                <img 
                                    src={col.image} 
                                    alt={col.name}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                />
                            </div>
                            <h3 className="text-2xl font-serif text-[#1A1A1A] text-center italic group-hover:text-[#C6A35E] transition-colors">
                                {col.name}
                            </h3>
                            <div className="text-center mt-2">
                                <span className="text-xs uppercase tracking-widest text-gray-400 border-b border-gray-200 pb-1 group-hover:border-[#C6A35E] transition-colors">Discover</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Brand Spotlight */}
            <div className="bg-[#1A1A1A] py-24 text-white">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <span className="text-[#C6A35E] uppercase tracking-widest text-xs">Editor's Pick</span>
                        <h2 className="text-5xl font-serif leading-tight">
                            "Elegance is not standing out, but being remembered."
                        </h2>
                        <p className="text-gray-400 leading-relaxed font-sans max-w-md">
                            Discover our curated selection of timeless pieces designed to elevate your wardrobe. From sustainable fabrics to artisan craftsmanship.
                        </p>
                        <button 
                            onClick={() => navigate('/search')}
                            className="inline-flex items-center gap-3 text-white border-b border-[#C6A35E] pb-2 uppercase tracking-widest text-xs hover:text-[#C6A35E] transition-colors"
                        >
                            Shop Essentials <ArrowRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-1 relative h-[600px] w-full">
                         <img 
                            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2020&auto=format&fit=crop" 
                            className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                            alt="Editorial"
                        />
                         <div className="absolute -bottom-6 -left-6 bg-[#C6A35E] p-8 hidden md:block">
                            <p className="text-[#1A1A1A] font-serif text-2xl italic">New Season</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FashionPage;
