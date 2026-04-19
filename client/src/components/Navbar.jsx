import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { MagnifyingGlassIcon, ShoppingBagIcon, UserIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartTotal } = useCart();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const user = JSON.parse(localStorage.getItem('user'));

    const isHomePage = location.pathname === '/';

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        window.location.reload();
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchOpen(false);
        }
    };

    // Dynamic Classes
    // "The Janky Scroll" Fix: Smooth transition from transparent to white
    const navBackground = isHomePage 
        ? (isScrolled ? 'bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100 py-3' : 'bg-transparent py-6 border-b border-transparent')
        : 'bg-white shadow-md border-b border-gray-100 py-3';
    
    // Text colors flip based on background state
    const textColor = isHomePage && !isScrolled ? 'text-white' : 'text-[#1A1A1A]';
    const iconColor = isHomePage && !isScrolled ? 'text-white hover:text-white/80' : 'text-[#1A1A1A] hover:text-[#C6A35E]';
    const inputBg = isHomePage && !isScrolled ? 'bg-white/10 text-white placeholder-white/70 border-white/20' : 'bg-white text-[#1A1A1A] placeholder-gray-400 border-gray-200';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${navBackground}`}>
            <div className="container mx-auto px-6 md:px-12 flex items-center justify-between">
                
                {/* Left: Mobile Menu & Logo */}
                <div className="flex items-center gap-6">
                    <button className="lg:hidden">
                        <Bars3Icon className={`h-6 w-6 ${iconColor}`} />
                    </button>
                    <Link to="/" className={`text-3xl font-serif font-bold tracking-tight transition-colors ${textColor}`}>
                        EverShop
                    </Link>
                </div>

                {/* Center: Search Bar (Desktop) - Replaces Links when open or just always visible if preferred, let's make it expand */}
                <div className={`hidden lg:flex flex-1 max-w-xl mx-12 transition-all duration-300 ${isSearchOpen ? 'opacity-100 scale-100' : 'opacity-100'}`}>
                     <form onSubmit={handleSearchSubmit} className="relative w-full group">
                        <input 
                            type="text" 
                            placeholder="Search our collection..." 
                            className={`w-full px-5 py-2.5 rounded-full border focus:outline-none focus:ring-1 focus:ring-[#C6A35E] focus:border-[#C6A35E] transition-all font-sans text-sm ${inputBg}`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button type="submit" className={`absolute right-3 top-1/2 -translate-y-1/2 ${isHomePage && !isScrolled ? 'text-white' : 'text-gray-400 hover:text-[#C6A35E]'}`}>
                            <MagnifyingGlassIcon className="h-5 w-5" />
                        </button>
                    </form>
                </div>

                {/* Right: Icons & Links */}
                <div className="flex items-center space-x-6 md:space-x-8">
                     <div className="hidden md:flex items-center space-x-6">
                        <Link to="/" className={`text-xs font-bold tracking-widest uppercase hover:text-[#C6A35E] transition-colors ${textColor}`}>Home</Link>
                        <Link to="/search" className={`text-xs font-bold tracking-widest uppercase hover:text-[#C6A35E] transition-colors ${textColor}`}>Shop</Link>
                        {user?.role === 'Vendor' && (
                            <Link to="/vendor/add-product" className={`text-xs font-bold tracking-widest uppercase hover:text-[#C6A35E] transition-colors ${textColor}`}>Vendor</Link>
                        )}
                    </div>

                    <div className="h-4 w-px bg-current opacity-20 hidden md:block"></div>

                    <div className="flex items-center space-x-5">
                        <div className="relative group cursor-pointer pb-2 pt-2">
                             {/* Intelligent Routing based on Role */}
                             <Link to={
                                 user?.role === 'Administrator' ? "/admin" : 
                                 user?.role === 'Vendor' ? "/vendor" : 
                                 user ? "/account" : "/login"
                             }>
                                <UserIcon className={`h-6 w-6 stroke-1 transition-colors ${iconColor}`} />
                            </Link>

                             {/* Luxury Dropdown */}
                             <div className="absolute right-0 top-full mt-0 w-56 bg-white rounded-sm shadow-soft py-2 hidden group-hover:block border border-gray-100 origin-top-right animate-in fade-in slide-in-from-top-2">
                                {user ? (
                                    <>
                                        <div className="px-6 py-3 border-b border-gray-50">
                                            <p className="text-[10px] uppercase tracking-widest text-[#C6A35E] font-bold mb-1">Signed In</p>
                                            <p className="text-sm font-serif text-[#1A1A1A] truncate">{user.name}</p>
                                        </div>
                                        
                                        {user.role === 'Administrator' && (
                                            <Link to="/admin" className="block w-full text-left px-6 py-3 hover:bg-[#F8F7F4] text-sm text-gray-600 hover:text-[#C6A35E] transition-colors">Admin Dashboard</Link>
                                        )}
                                        {user.role === 'Vendor' && (
                                            <Link to="/vendor" className="block w-full text-left px-6 py-3 hover:bg-[#F8F7F4] text-sm text-gray-600 hover:text-[#C6A35E] transition-colors">Vendor Portal</Link>
                                        )}
                                        <Link to="/account" className="block w-full text-left px-6 py-3 hover:bg-[#F8F7F4] text-sm text-gray-600 hover:text-[#C6A35E] transition-colors">My Account</Link>
                                        
                                        <button onClick={handleLogout} className="block w-full text-left px-6 py-3 hover:bg-[#F8F7F4] text-sm text-gray-600 hover:text-red-500 transition-colors">Sign Out</button>
                                    </>
                                ) : (
                                    <Link to="/login" className="block px-6 py-3 hover:bg-[#F8F7F4] text-sm text-gray-600 hover:text-[#C6A35E]">Sign In / Register</Link>
                                )}
                            </div>
                        </div>

                        <Link to="/cart" className={`relative group ${iconColor}`}>
                            <ShoppingBagIcon className="h-6 w-6 stroke-1 transition-colors" />
                            {cartTotal > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C6A35E] text-[10px] font-bold text-white shadow-sm">
                                    {cartTotal.toFixed(0)}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
