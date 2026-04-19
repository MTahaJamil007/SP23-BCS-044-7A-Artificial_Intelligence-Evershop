import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const HeroLuxury = () => {
    const navigate = useNavigate();

    return (
        <div className="relative h-screen w-full overflow-hidden">
            {/* Background - Parallax-like feel or just static high-res */}
            <div className="absolute inset-0">
                <img 
                    src="https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=2700&auto=format&fit=crop" 
                    alt="Luxury Interior" 
                    className="w-full h-full object-cover"
                />
                {/* Overlay: Gradient for text readability + moody vibe */}
                <div className="absolute inset-0 bg-black/40 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>

            {/* Content Content */}
            <div className="absolute inset-0 flex items-center justify-center text-center">
                <div className="max-w-4xl px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                    >
                        <p className="text-white/90 text-sm md:text-base tracking-[0.2em] uppercase mb-6 font-medium">
                            The Collection 2025
                        </p>
                        <h1 className="text-5xl md:text-8xl text-white font-serif mb-8 leading-tight">
                            Curated <br/> <span className="italic font-light">Excellence</span>
                        </h1>
                        <p className="text-white/80 text-lg md:text-xl font-light mb-10 max-w-xl mx-auto leading-relaxed">
                            Discover premium items from world-class vendors, hand-picked for the discerning taste.
                        </p>
                        
                        <button 
                            onClick={() => navigate('/search')}
                            className="group relative inline-flex items-center justify-center px-10 py-4 overflow-hidden font-medium tracking-tighter text-white bg-transparent border border-white/50 rounded-none hover:bg-white transition-all duration-300 ease-out"
                        >
                            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-white"></span>
                            <span className="relative text-white group-hover:text-black tracking-widest text-sm uppercase transition-colors">
                                Explore Collection
                            </span>
                        </button>
                    </motion.div>
                </div>
            </div>
            
            {/* Scroll Indicator */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex flex-col items-center"
            >
                <span className="text-white/50 text-[10px] tracking-widest uppercase mb-2">Scroll</span>
                <div className="w-[1px] h-12 bg-white/20">
                    <motion.div 
                        animate={{ y: [0, 50, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="w-full h-1/2 bg-white/60"
                    />
                </div>
            </motion.div>
        </div>
    );
};

export default HeroLuxury;
