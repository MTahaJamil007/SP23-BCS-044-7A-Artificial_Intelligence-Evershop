import React from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
    { name: 'Fashion', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80', description: 'Timeless Style' },
    { name: 'Technology', image: 'https://images.unsplash.com/photo-1468495244123-6c6ef332ad63?w=800&q=80', description: 'Innovation First' },
    { name: 'Home', image: 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=800&q=80', description: 'Modern Living' },
    { name: 'Accessories', image: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=800&q=80', description: 'Finishing Touches' },
    { name: 'Beauty', image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&q=80', description: 'Pure Radiance' },
];

const CategoryEditorial = () => {
    const navigate = useNavigate();

    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex justify-between items-baseline mb-12">
                     <h2 className="text-3xl md:text-4xl font-serif text-gray-900">Shop by Category</h2>
                     <button onClick={() => navigate('/search')} className="text-sm border-b border-gray-300 pb-1 hover:border-black transition-colors">View All</button>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide">
                    {CATEGORIES.map((cat) => (
                        <div 
                            key={cat.name}
                            onClick={() => navigate('/search')}
                            className="relative flex-none w-[300px] md:w-[400px] aspect-[3/4] group cursor-pointer snap-center"
                        >
                            <div className="absolute inset-0 overflow-hidden">
                                <img 
                                    src={cat.image} 
                                    alt={cat.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300"></div>
                            </div>
                            
                            <div className="absolute bottom-0 left-0 p-8 w-full text-white">
                                <p className="text-xs tracking-widest uppercase mb-2 opacity-80 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    {cat.description}
                                </p>
                                <h3 className="text-3xl font-serif translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                                    {cat.name}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CategoryEditorial;
