import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShoppingBagIcon, 
    UserIcon, 
    MapPinIcon, 
    HeartIcon, 
    ArrowRightOnRectangleIcon, 
    StarIcon as StarIconOutline,
    XMarkIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const [activeTab, setActiveTab] = useState('orders');

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        window.location.reload();
    };

    const tabs = [
        { id: 'orders', label: 'My Orders', icon: ShoppingBagIcon },
        { id: 'wishlist', label: 'Wishlist', icon: HeartIcon },
        { id: 'following', label: 'Following', icon: StarIconOutline },
        { id: 'addresses', label: 'Addresses', icon: MapPinIcon },
        { id: 'profile', label: 'Profile', icon: UserIcon },
    ];

    return (
        <div className="min-h-screen bg-[#F8F7F4] flex flex-col md:flex-row font-sans pt-20"> {/* PT-20 for fixed navbar */}
            
            {/* Sidebar (Desktop) / Tabs (Mobile) */}
            <aside className="w-full md:w-64 bg-[#0F172A] text-white flex-shrink-0 md:min-h-screen">
                <div className="p-8 hidden md:block">
                    <h2 className="text-2xl font-serif font-bold text-white mb-2">My Account</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Welcome back, {user?.name?.split(' ')[0]}</p>
                </div>

                <nav className="flex md:flex-col overflow-x-auto md:overflow-visible">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center space-x-3 px-8 py-4 text-sm font-medium transition-all w-full text-left whitespace-nowrap md:whitespace-normal
                                ${activeTab === tab.id 
                                    ? 'bg-[#C6A35E] text-white shadow-lg' 
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <tab.icon className="h-5 w-5" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                    <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-8 py-4 text-sm font-medium text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-all w-full text-left mt-auto border-t border-gray-800 md:border-none"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span>Sign Out</span>
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 md:p-12 lg:p-16">
                {activeTab === 'orders' && <OrderHistory />}
                {activeTab === 'wishlist' && <Wishlist />}
                {activeTab === 'following' && <Following />}
                {activeTab === 'profile' && <Placeholder title="Personal Profile" />}
                {activeTab === 'addresses' && <Placeholder title="Address Book" />}
            </main>
        </div>
    );
};

// --- Sub-Components ---

const OrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (user && user.id) {
            fetchOrders();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`http://localhost:5001/api/orders/user?userId=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setOrders(data);
                } else {
                    console.error("API returned non-array:", data);
                    setOrders([]);
                }
            } else {
                console.error("Failed to fetch orders:", response.status);
            }
        } catch (err) {
            console.error("Failed to fetch orders", err);
        } finally {
            setLoading(false);
        }
    };

    const openReviewModal = (item, orderId) => {
        setSelectedItem({ ...item, orderId });
        setReviewModalOpen(true);
    };

    const handleReviewSuccess = () => {
        setReviewModalOpen(false);
        alert("Review Submitted Successfully!");
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading your exclusive history...</div>;

    if (!orders || orders.length === 0) return (
        <div className="text-center py-20 bg-white shadow-soft">
            <h3 className="text-xl font-serif text-[#1A1A1A] mb-4">No Orders Yet</h3>
            <p className="text-gray-500 mb-8">Your journey of luxury begins with a single selection.</p>
            <a href="/search" className="text-[#C6A35E] font-bold uppercase tracking-widest text-xs border-b border-[#C6A35E] pb-1">Start Shopping</a>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] mb-8">Order History</h1>
            
            <div className="space-y-8">
                {orders.map(order => (
                    <div key={order.id} className="bg-white rounded-sm shadow-soft border border-gray-100 overflow-hidden">
                        {/* Card Header */}
                        <div className="bg-gray-50 px-6 py-4 flex flex-wrap gap-4 justify-between items-center border-b border-gray-200">
                            <div className="flex gap-8">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order Placed</p>
                                    <p className="text-sm font-medium text-[#1A1A1A]">{new Date(order.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
                                    <p className="text-sm font-medium text-[#1A1A1A]">${Number(order.total_amount || 0).toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order #</p>
                                    <p className="text-sm font-medium text-[#1A1A1A]">{order.id}</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full 
                                ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 
                                  order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {order.status}
                            </span>
                        </div>

                        {/* Items */}
                        <div className="p-6">
                            {Array.isArray(order.items) && order.items.map((item, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-6 last:mb-0">
                                    <img 
                                        src={item.image_url ? `http://localhost:5001/${item.image_url}` : 'https://via.placeholder.com/150'} 
                                        alt={item.name} 
                                        className="w-20 h-20 object-cover bg-gray-100" 
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                                    />
                                    
                                    <div className="flex-1">
                                        <h3 className="font-serif text-lg font-bold text-[#1A1A1A] mb-1">{item.name}</h3>
                                        <p className="text-sm text-gray-500 mb-4 sm:mb-0">Qty: {item.quantity} • ${Number(item.price).toFixed(2)}</p>
                                    </div>

                                    {order.status === 'Delivered' && (
                                        <div className="w-full sm:w-auto">
                                            <button 
                                                onClick={() => openReviewModal(item, order.id)}
                                                className="w-full sm:w-auto px-6 py-2 border border-[#C6A35E] text-[#C6A35E] text-xs font-bold uppercase tracking-widest hover:bg-[#C6A35E] hover:text-white transition-all"
                                            >
                                                Write a Review
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Review Modal */}
            {reviewModalOpen && selectedItem && user && (
                <ReviewModal 
                    user={user}
                    item={selectedItem} 
                    onClose={() => setReviewModalOpen(false)} 
                    onSuccess={handleReviewSuccess} 
                />
            )}
        </div>
    );
};

const ReviewModal = ({ user, item, onClose, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!rating) return;
        setSubmitting(true);
        try {
            await fetch('http://localhost:5001/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    productId: item.product_id, 
                    rating: rating,
                    comment: reviewText
                })
            });
            onSuccess();
        } catch (err) {
            console.error("Failed to submit review", err);
            alert("Failed to submit review.");
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black">
                    <XMarkIcon className="h-6 w-6" />
                </button>

                <h3 className="text-2xl font-serif font-bold text-center mb-2">How was your order?</h3>
                <p className="text-center text-gray-500 text-sm mb-6">Reviewing: <span className="font-bold text-[#1A1A1A]">{item.name}</span></p>

                {/* Stars */}
                <div className="flex justify-center mb-6 space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            className="focus:outline-none transition-transform hover:scale-110"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHover(star)}
                            onMouseLeave={() => setHover(0)}
                        >
                            {star <= (hover || rating) ? (
                                <StarIconSolid className="h-8 w-8 text-[#C6A35E]" />
                            ) : (
                                <StarIconOutline className="h-8 w-8 text-gray-300" />
                            )}
                        </button>
                    ))}
                </div>

                <textarea
                    className="w-full h-32 border border-gray-200 p-4 text-sm focus:outline-none focus:border-[#C6A35E] focus:ring-1 focus:ring-[#C6A35E] mb-6 resize-none"
                    placeholder="Tell us about your experience..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                ></textarea>

                <button
                    onClick={handleSubmit}
                    disabled={!rating}
                    className={`w-full py-4 text-white text-xs font-bold tracking-[0.2em] uppercase transition-all
                        ${rating 
                            ? 'bg-[#C6A35E] hover:bg-[#b08d4b] shadow-lg hover:shadow-xl' 
                            : 'bg-gray-300 cursor-not-allowed'}`}
                >
                    Submit Review
                </button>
            </div>
        </div>
    );
};

const Wishlist = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWishlist = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch('http://localhost:5001/api/social/wishlist', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setItems(await res.json());
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchWishlist();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] mb-8">My Wishlist</h1>
            {items.length === 0 ? <p className="text-gray-500">Your wishlist is empty.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => (
                        <div key={item.id} className="group relative bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all">
                             <div className="aspect-square bg-gray-100 overflow-hidden relative">
                                <img 
                                    src={item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `http://localhost:5001/${item.image_url}`) : 'https://via.placeholder.com/300'} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                            </div>
                            <div className="p-4">
                                <h3 className="font-serif font-bold text-[#1A1A1A] mb-1">{item.name}</h3>
                                <p className="text-sm text-gray-500 mb-3">${Number(item.price).toFixed(2)}</p>
                                <a href={`/product/${item.id}`} className="block text-center w-full py-2 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-gray-800">
                                    View Product
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Following = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFollowing = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await fetch('http://localhost:5001/api/social/following', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setStores(await res.json());
            } catch (err) { console.error(err); } 
            finally { setLoading(false); }
        };
        fetchFollowing();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] mb-8">Followed Stores</h1>
            {stores.length === 0 ? <p className="text-gray-500">You are not following any stores yet.</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {stores.map((store, i) => (
                         <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-200 shadow-sm">
                            <div className="h-16 w-16 bg-gray-100 rounded-full overflow-hidden">
                                <img src={`http://localhost:5001/${store.store_logo_url}`} alt={store.store_name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[#1A1A1A]">{store.store_name}</h3>
                                <a href={`/store/${store.vendor_id}`} className="text-xs text-[#C6A35E] font-bold uppercase tracking-widest hover:underline mt-1 block">
                                    Visit Store
                                </a>
                            </div>
                         </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const Placeholder = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-96 text-gray-400 border border-dashed border-gray-300 rounded-sm">
        <UserIcon className="h-12 w-12 mb-4 opacity-20" />
        <h2 className="text-xl font-serif text-[#1A1A1A]">{title}</h2>
        <p className="text-sm mt-2">This module is under development.</p>
    </div>
);

export default CustomerDashboard;
