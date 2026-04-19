import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, BoltIcon, CpuChipIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

const ElectronicsPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const features = [
        { title: "Next-Gen Audio", icon: BoltIcon, desc: "Immersive soundscapes designed for the audiophile." },
        { title: "Smart Living", icon: CpuChipIcon, desc: "Seamless integration for the modern connected home." },
        { title: "Mobile Innovation", icon: DevicePhoneMobileIcon, desc: "Power and performance in the palm of your hand." }
    ];

    return (
        <div className="bg-black min-h-screen text-white font-sans selection:bg-[#C6A35E] selection:text-black">
            {/* Hero Section */}
            <div className="relative h-[85vh] w-full flex items-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
                <img 
                    src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=2101&auto=format&fit=crop" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    alt="Tech Hero"
                />
                
                <div className="container mx-auto px-6 relative z-20">
                    <div className="max-w-2xl animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/20 rounded-full mb-8 backdrop-blur-sm">
                            <div className="w-2 h-2 bg-[#C6A35E] rounded-full animate-pulse" />
                            <span className="text-xs font-mono uppercase tracking-widest text-gray-300">Future Ready</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 leading-none">
                            BEYOND <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-600">LIMITS.</span>
                        </h1>
                        <p className="text-gray-400 text-lg mb-10 max-w-lg leading-relaxed">
                            Experience the intersection of masterful engineering and minimalist design. The future of technology is here.
                        </p>
                        <div className="flex gap-6">
                            <button 
                                onClick={() => navigate('/search?category=Electronics')}
                                className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wider hover:bg-[#C6A35E] transition-colors"
                            >
                                Shop Innovation
                            </button>
                            <button className="px-8 py-4 border border-white/30 font-bold uppercase tracking-wider hover:bg-white/10 transition-colors backdrop-blur-sm">
                                Watch Film
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="container mx-auto px-6 py-32 border-b border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {features.map((f, i) => (
                        <div key={i} className="group p-8 border border-white/10 hover:border-[#C6A35E]/50 transition-colors bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-sm">
                            <f.icon className="h-10 w-10 text-[#C6A35E] mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-2xl font-bold mb-4">{f.title}</h3>
                            <p className="text-gray-400 leading-relaxed">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Product Showcase */}
            <div className="py-24 bg-[#0A0A0A]">
                <div className="container mx-auto px-6">
                    <div className="flex justify-between items-end mb-16">
                         <div>
                            <span className="text-[#C6A35E] font-mono text-sm mb-2 block">01 / FEATURED</span>
                            <h2 className="text-4xl font-bold">Premium Gear</h2>
                        </div>
                         <button onClick={() => navigate('/search?category=Electronics')} className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
                            View All <ArrowRightIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative h-[600px] group overflow-hidden bg-[#151515]">
                            <img 
                                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=2065&auto=format&fit=crop" 
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105 transition-transform"
                                alt="Headphones"
                            />
                            <div className="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-black to-transparent">
                                <h3 className="text-3xl font-bold mb-2">Sonic One</h3>
                                <p className="text-gray-400 mb-4">Active Noise Cancellation Pro</p>
                                <span className="text-[#C6A35E] font-mono text-sm items-center gap-2 flex cursor-pointer group-hover:translate-x-2 transition-transform">
                                    SHOP NOW <ArrowRightIcon className="h-3 w-3" />
                                </span>
                            </div>
                        </div>
                        <div className="grid gap-4">
                            <div className="relative h-full group overflow-hidden bg-[#151515]">
                                <img 
                                    src="https://images.unsplash.com/photo-1593642702749-b7d2a804fbcf?q=80&w=2000&auto=format&fit=crop" 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    alt="Laptop"
                                />
                                <div className="absolute bottom-0 left-0 p-8">
                                    <h3 className="text-2xl font-bold">Blade 15</h3>
                                    <span className="text-sm text-gray-400">The ultimate creator tool.</span>
                                </div>
                            </div>
                            <div className="relative h-full group overflow-hidden bg-[#151515]">
                                <img 
                                    src="https://images.unsplash.com/photo-1517336714731-489689fd1ca4?q=80&w=2026&auto=format&fit=crop" 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    alt="Workstation"
                                />
                                 <div className="absolute bottom-0 left-0 p-8">
                                    <h3 className="text-2xl font-bold">Studio X</h3>
                                    <span className="text-sm text-gray-400">Minimalist aesthetic.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ElectronicsPage;
