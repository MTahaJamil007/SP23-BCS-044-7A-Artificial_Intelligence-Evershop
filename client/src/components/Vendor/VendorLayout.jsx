import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline';

const VendorLayout = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-[#F8F7F4] flex flex-col font-sans">
            {/* Minimal Header - Midnight */}
            <header className="bg-[#0F172A] text-white shadow-md z-10 border-b border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link to="/vendor" className="text-xl font-serif font-bold tracking-wider text-[#C6A35E] hover:text-[#b08d4b] transition-colors">
                            EverShop <span className="text-gray-400 text-xs font-sans font-normal tracking-wide uppercase ml-2">Vendor Portal</span>
                        </Link>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 rounded-full bg-[#C6A35E] flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                {user?.name?.charAt(0) || 'V'}
                            </div>
                            <span className="text-sm font-medium text-gray-300 hidden md:block">{user?.name}</span>
                        </div>
                        <button 
                             onClick={handleLogout} 
                             className="text-gray-400 hover:text-white transition-colors"
                             title="Logout"
                        >
                            <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    );
};

export default VendorLayout;
