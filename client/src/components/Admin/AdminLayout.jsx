import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    Squares2X2Icon, 
    UserGroupIcon, 
    TagIcon, 
    Cog6ToothIcon, 
    ArrowLeftOnRectangleIcon 
} from '@heroicons/react/24/outline';

const AdminLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        window.location.reload();
    };

    const navItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: Squares2X2Icon },
        { name: 'User Management', path: '/admin/users', icon: UserGroupIcon }, 
        { name: 'Categories', path: '/admin/categories', icon: TagIcon },
        { name: 'Global Settings', path: '/admin/settings', icon: Cog6ToothIcon },
    ];

    return (
        <div className="flex h-screen bg-[#F8F7F4] overflow-hidden font-sans">
            {/* Sidebar - Midnight */}
            <div className="w-64 bg-[#0F172A] text-gray-300 flex flex-col border-r border-[#1e293b]">
                <div className="p-6">
                    <h1 className="text-xl font-serif font-bold text-white tracking-widest uppercase">Admin<span className="text-[#C6A35E]">Panel</span></h1>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">System Control</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-sm transition-all text-sm font-medium tracking-wide ${
                                    isActive ? 'bg-[#C6A35E] text-white shadow-md' : 'hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 border-t border-[#1e293b]">
                    <div className="flex items-center space-x-3 mb-4">
                         <div className="h-9 w-9 rounded bg-[#1e293b] flex items-center justify-center font-bold text-[#C6A35E] border border-[#C6A35E]/20">A</div>
                         <div>
                             <p className="text-sm font-bold text-white">Administrator</p>
                             <p className="text-[10px] text-gray-500 uppercase tracking-wider">Super User</p>
                         </div>
                    </div>
                    <button 
                         onClick={handleLogout} 
                         className="flex items-center space-x-2 text-gray-400 hover:text-red-400 text-xs transition-colors w-full uppercase tracking-widest"
                    >
                        <ArrowLeftOnRectangleIcon className="h-4 w-4" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content - Alabaster */}
            <div className="flex-1 flex flex-col bg-[#F8F7F4] text-[#1A1A1A]">
                <header className="bg-white shadow-soft px-8 py-4 flex justify-between items-center border-b border-gray-100 h-16">
                    <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">
                        {navItems.find(i => i.path === location.pathname)?.name || 'Control Panel'}
                    </h2>
                    <div className="text-xs font-mono text-gray-400">v1.2.0 • EverShop Luxury</div>
                </header>
                
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
