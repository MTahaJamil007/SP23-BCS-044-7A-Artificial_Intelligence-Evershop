import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const SLIDES = [
    {
        id: 1,
        title: "Next-Gen Tech",
        subtitle: "Upgrade your lifestyle with the latest gadgets.",
        cta: "Shop Electronics",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80", // Placeholder (Shoe actually, but looks cool) - keeping broad for demo
        color: "bg-blue-900"
    },
    {
        id: 2,
        title: "Modern Living",
        subtitle: "Transform your space with our premium home collection.",
        cta: "Explore Home",
        image: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=1600&q=80",
        color: "bg-emerald-900"
    },
    {
        id: 3,
        title: "Flash Sale",
        subtitle: "Up to 50% off on selected fashion items this week.",
        cta: "View Deals",
        image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80",
        color: "bg-purple-900"
    }
];

const HeroCarousel = () => {
    const navigate = useNavigate();
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const slide = SLIDES[current];

    return (
        <div className="relative h-[500px] w-full overflow-hidden bg-gray-900">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0"
                >
                    {/* Background Image */}
                    <img 
                        src={slide.image} 
                        alt={slide.title} 
                        className="w-full h-full object-cover opacity-60"
                    />
                    {/* Gradient Overlay */}
                    <div className={`absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/60 to-transparent`} />
                </motion.div>
            </AnimatePresence>

            {/* Content Content */}
            <div className="absolute inset-0 flex items-center">
                <div className="container mx-auto px-6 md:px-12">
                    <motion.div
                        key={current + "-text"}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="max-w-xl text-white space-y-6"
                    >
                        <span className="inline-block px-3 py-1 bg-yellow-400 text-gray-900 text-xs font-bold tracking-wider uppercase rounded-full">
                            New Arrivals
                        </span>
                        <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                            {slide.title}
                        </h1>
                        <p className="text-lg text-gray-200">
                            {slide.subtitle}
                        </p>
                        <button 
                            onClick={() => navigate('/search')}
                            className="group flex items-center space-x-2 bg-white text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors shadow-lg"
                        >
                            <span>{slide.cta}</span>
                            <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </div>
            </div>

            {/* Dots */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {SLIDES.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        className={`h-2 w-2 rounded-full transition-all duration-300 ${
                            idx === current ? "w-8 bg-yellow-400" : "bg-gray-500 hover:bg-white"
                        }`}
                    />
                ))}
            </div>
        </div>
    );
};

export default HeroCarousel;
