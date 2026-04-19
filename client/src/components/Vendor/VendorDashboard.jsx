import React, { useState, useEffect } from 'react';
import { getVendorStats, getVendorProducts, getVendorOrders, updateProduct, deleteProduct, updateOrderStatus, getSettings } from '../../api/axios';
import { CurrencyDollarIcon, ShoppingBagIcon, ExclamationTriangleIcon, PencilSquareIcon, TrashIcon, Squares2X2Icon, ClipboardDocumentListIcon, CubeIcon, Cog6ToothIcon, UserGroupIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../Common/EmptyState';

const VendorDashboard = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ totalSales: 0, pendingOrders: 0, lowStock: 0 });
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [commissionRate, setCommissionRate] = useState(0);
    const [loading, setLoading] = useState(true);

    // Edit State
    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState({ stock_quantity: 0, price: 0 });

    const [followers, setFollowers] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const authHeader = { headers: { 'Authorization': `Bearer ${token}` } };
            
            const [statsRes, prodRes, ordRes, settingsRes, profileRes, followersRes] = await Promise.all([
                getVendorStats(),
                getVendorProducts(),
                getVendorOrders(),
                getSettings(),
                fetch('http://localhost:5001/api/vendor/profile', authHeader).then(res => res.json()),
                fetch('http://localhost:5001/api/social/followers', authHeader).then(res => res.json())
            ]);
            setStats(statsRes.data);
            setProducts(prodRes.data);
            setOrders(ordRes.data);
            if (settingsRes.data.commission_rate) setCommissionRate(parseFloat(settingsRes.data.commission_rate));

             // Populate Profile Form
             if (profileRes) {
                setProfileForm({
                    store_name: profileRes.store_name || '',
                    store_description: profileRes.store_description || '',
                    store_logo: null,
                    store_banner: null,
                    logoPreview: profileRes.store_logo_url ? `http://localhost:5001/${profileRes.store_logo_url}` : null,
                    bannerPreview: profileRes.store_banner_url ? `http://localhost:5001/${profileRes.store_banner_url}` : null,
                });
            }
            // Set Followers
            if (Array.isArray(followersRes)) setFollowers(followersRes);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard data', err);
            setLoading(false);
        }
    };
    
    const netPayout = (stats.totalSales * (1 - (commissionRate / 100))).toFixed(2);

    // Product Actions
    const handleEditClick = (product) => {
        setEditingProduct(product.id);
        setEditForm({ stock_quantity: product.stock_quantity, price: product.price });
    };

    const handleSaveProduct = async (id) => {
        try {
            await updateProduct(id, editForm);
            setEditingProduct(null);
            fetchData(); 
        } catch (err) {
            alert('Failed to update product');
        }
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(id);
                fetchData();
            } catch (err) {
                alert('Failed to delete product');
            }
        }
    };

    // Profile State
    const [profileForm, setProfileForm] = useState({
        store_name: '',
        store_description: '',
        store_logo: null,
        store_banner: null,
        logoPreview: null,
        bannerPreview: null
    });

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            setProfileForm({
                ...profileForm,
                [field]: file,
                [field === 'store_logo' ? 'logoPreview' : 'bannerPreview']: URL.createObjectURL(file)
            });
        }
    };

    const handleSaveProfile = async () => {
        try {
            const formData = new FormData();
            formData.append('store_name', profileForm.store_name);
            formData.append('store_description', profileForm.store_description);
            if (profileForm.store_logo instanceof File) formData.append('store_logo', profileForm.store_logo);
            if (profileForm.store_banner instanceof File) formData.append('store_banner', profileForm.store_banner);

            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5001/api/vendor/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                alert('Store Profile Updated Successfully!');
                fetchData(); // Refresh to ensure sync
            } else {
                alert('Update failed');
            }
        } catch (err) {
            console.error(err);
            alert('Server error during save');
        }
    };

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            fetchData();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const navItems = [
        { id: 'overview', label: 'Overview', icon: Squares2X2Icon },
        { id: 'products', label: 'Products', icon: CubeIcon },
        { id: 'orders', label: 'Orders', icon: ClipboardDocumentListIcon },
        { id: 'followers', label: 'Followers', icon: UserGroupIcon },
        { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
    ];

    if (loading) return <div className="p-10 text-center animate-pulse font-serif text-[#C6A35E]">Loading Boutique Dashboard...</div>;

    // ... (rest of code)

    return (
        <div className="flex flex-col md:flex-row min-h-[800px] bg-[#F8F7F4]"> 
            
            {/* Mobile Header */}
            <div className="md:hidden bg-[#1A1A1A] text-white p-4 flex justify-between items-center sticky top-0 z-30 shadow-md">
                <span className="font-serif font-bold text-lg">Vendor Portal</span>
                <button onClick={() => setSidebarOpen(true)}>
                    <Bars3Icon className="h-6 w-6" />
                </button>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation (Drawer on Mobile) */}
            <div className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-[#1A1A1A] border-r border-gray-800 text-white transform transition-transform duration-300 ease-in-out
                md:translate-x-0 md:static md:block md:h-auto md:shrink-0
                ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            `}>
                <div className="p-6 flex justify-between items-center">
                    <span className="text-xl font-serif font-bold hidden md:block">Dashboard</span>
                    <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <button 
                        onClick={() => {
                            navigate('/vendor/add-product');
                            setSidebarOpen(false);
                        }}
                        className="w-full bg-[#C6A35E] hover:bg-[#b08d4b] text-white font-medium py-3 px-4 rounded-sm flex items-center justify-center transition-colors shadow-sm uppercase tracking-wider text-xs"
                    >
                         + Add Product
                    </button>
                </div>
                <nav className="mt-2 text-sm font-medium">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                setSidebarOpen(false);
                            }}
                            className={`flex items-center px-6 py-4 w-full text-left transition-colors border-l-4 ${
                                activeTab === item.id 
                                ? 'bg-white/5 border-[#C6A35E] text-[#C6A35E] shadow-sm' 
                                : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-auto p-8 bg-[#F8F7F4]">
                
                {/* 1. Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Dashboard Overview</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <MetricCard title="Total Sales" value={`$${parseFloat(stats.totalSales).toFixed(2)}`} icon={CurrencyDollarIcon} color="bg-[#C6A35E] text-white" />
                            <MetricCard title="Net Payout" value={`$${netPayout}`} label={`After ${commissionRate}% Fee`} icon={CurrencyDollarIcon} color="bg-[#1A1A1A] text-white" />
                            <MetricCard title="Orders Pending" value={stats.pendingOrders} icon={ShoppingBagIcon} color="bg-gray-200 text-gray-600" />
                            <MetricCard title="Store Followers" value={followers.length} icon={UserGroupIcon} color="bg-orange-100 text-orange-600" />
                        </div>
                    </div>
                )}

                {/* 2. Products Tab */}
                {activeTab === 'products' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Inventory Management</h2>
                            <button onClick={() => navigate('/vendor/add-product')} className="md:hidden bg-[#C6A35E] text-white px-4 py-2 rounded-sm text-sm uppercase">Add</button>
                        </div>
                        {products.length > 0 ? (
                            <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-[#1A1A1A] text-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Stock</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {products.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-12 w-12 flex-shrink-0 border border-gray-200">
                                                            {product.image_url ? (
                                                                <img className="h-full w-full object-cover" src={`http://localhost:5001/${product.image_url}`} alt="" />
                                                            ) : (
                                                                <div className="h-full w-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">N/A</div>
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-bold text-[#1A1A1A] font-serif">{product.name}</div>
                                                            <div className="text-xs text-gray-500 uppercase tracking-wide">{product.category}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">
                                                    {editingProduct === product.id ? <input type="number" className="w-20 border rounded px-1" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: e.target.value})} /> : `$${product.price}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {editingProduct === product.id ? (
                                                        <input type="number" className="w-16 border rounded px-1" value={editForm.stock_quantity} onChange={(e) => setEditForm({...editForm, stock_quantity: e.target.value})} />
                                                    ) : (
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold uppercase tracking-wider ${product.stock_quantity < 5 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                                            {product.stock_quantity} Units
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 uppercase">Active</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {editingProduct === product.id ? (
                                                        <button onClick={() => handleSaveProduct(product.id)} className="text-green-600 hover:text-green-900 mr-4 font-bold uppercase text-xs">Save</button>
                                                    ) : (
                                                        <button onClick={() => handleEditClick(product)} className="text-gray-400 hover:text-[#C6A35E] mr-4 transition-colors"><PencilSquareIcon className="h-5 w-5" /></button>
                                                    )}
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-400 hover:text-red-600 transition-colors"><TrashIcon className="h-5 w-5" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-8">
                                <EmptyState 
                                    title="No Products Yet" 
                                    description="Start building your catalog by adding your first product."
                                    actionLabel="Add Product"
                                    onAction={() => navigate('/vendor/add-product')}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Orders Tab */}
                {activeTab === 'orders' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Order Fulfillment</h2>
                        {orders.length > 0 ? (
                            <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-[#1A1A1A] text-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Sub-Order ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Customer</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">My Payout</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Workflow Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#1A1A1A]">#{order.id}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.customer_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#C6A35E]">${order.vendor_total}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                                                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        <select 
                                                            value={order.status} 
                                                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                            className="bg-transparent border-none p-0 text-xs font-bold focus:ring-0 cursor-pointer"
                                                        >
                                                            <option value="Processing">Processing</option>
                                                            <option value="Shipped">Shipped</option>
                                                            <option value="Delivered">Delivered</option>
                                                            <option value="Cancelled">Cancelled</option>
                                                        </select>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-8">
                                <EmptyState 
                                    title="No Orders Yet" 
                                    description="Orders will appear here once customers start purchasing your products."
                                />
                            </div>
                        )}
                    </div>
                )}
                {/* 4. Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Storefront Design</h2>
                            <button onClick={handleSaveProfile} className="bg-[#C6A35E] hover:bg-[#b08d4b] text-white px-6 py-2 rounded-sm font-bold uppercase tracking-widest text-xs transition-colors shadow-sm">
                                Save Changes
                            </button>
                        </div>
                        {/* ... (Inputs using focus:ring-[#C6A35E] instead of indigo) ... */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* General Info */}
                            <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200 space-y-6">
                                <h3 className="text-lg font-bold text-[#1A1A1A] border-b border-gray-100 pb-2 font-serif">General Information</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide text-xs">Store Name</label>
                                    <input 
                                        type="text" 
                                        value={profileForm.store_name}
                                        onChange={(e) => setProfileForm({...profileForm, store_name: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-[#C6A35E] focus:border-[#C6A35E]"
                                        placeholder="e.g. Royalistan Tech"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide text-xs">About Your Store</label>
                                    <textarea 
                                        value={profileForm.store_description}
                                        onChange={(e) => setProfileForm({...profileForm, store_description: e.target.value})}
                                        rows={6}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-sm focus:ring-1 focus:ring-[#C6A35E] focus:border-[#C6A35E]"
                                        placeholder="Tell your story..."
                                    />
                                </div>
                            </div>

                            {/* Branding Assets */}
                            <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-200 space-y-6">
                                <h3 className="text-lg font-bold text-[#1A1A1A] border-b border-gray-100 pb-2 font-serif">Branding Assets</h3>
                                
                                {/* Logo Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide text-xs">Store Logo (Square)</label>
                                    <div className="flex items-center gap-4">
                                        <div className="h-24 w-24 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden relative">
                                            {profileForm.logoPreview ? (
                                                <img src={profileForm.logoPreview} alt="Preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400">No Logo</span>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            onChange={(e) => handleFileChange(e, 'store_logo')}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-[#1A1A1A] file:text-white hover:file:bg-black"
                                        />
                                    </div>
                                </div>

                                {/* Banner Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide text-xs">Store Banner (Wide)</label>
                                    <div className="h-40 w-full rounded-sm bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden relative mb-2">
                                         {profileForm.bannerPreview ? (
                                            <img src={profileForm.bannerPreview} alt="Preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="text-sm text-gray-400">1200x400 Recommended</span>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        onChange={(e) => handleFileChange(e, 'store_banner')}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:uppercase file:tracking-widest file:bg-[#1A1A1A] file:text-white hover:file:bg-black"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* 5. Followers Tab */}
                {activeTab === 'followers' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Your Community ({followers.length})</h2>
                        <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
                             {followers.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-[#1A1A1A] text-white">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Customer Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Followed Since</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {followers.map((f, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#1A1A1A] font-serif">{f.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{f.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(f.created_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    No followers yet. Promote your store link!
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, label, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center space-x-4 transition-transform hover:scale-105 duration-200">
        <div className={`p-4 rounded-full ${color} bg-opacity-20`}>
            <Icon className="h-8 w-8" />
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {label && <p className="text-[10px] text-gray-400 mt-1">{label}</p>}
        </div>
    </div>
);

export default VendorDashboard;
