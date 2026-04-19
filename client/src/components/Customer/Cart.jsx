import React, { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { createOrder } from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline'; // More elegant icons

const Cart = () => {
    const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCheckout = async () => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            alert('Please log in to checkout');
            navigate('/login');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const orderData = {
                userId: user.id,
                cartItems: cart.map(item => ({ id: item.id, quantity: item.quantity })),
            };

            await createOrder(orderData);
            clearCart();
            // Optional: Redirect to a custom Success Page instead of alert
            alert('Order placed successfully!');
            navigate('/'); 
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Checkout failed');
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex flex-col items-center justify-center pt-20">
                <h2 className="text-3xl font-serif font-bold mb-4 text-[#1A1A1A]">Your Bag is Empty</h2>
                <p className="text-gray-500 mb-8 font-sans">Looks like you haven't made your choice yet.</p>
                <button 
                    onClick={() => navigate('/search')}
                    className="px-8 py-3 bg-[#1A1A1A] text-white text-sm tracking-widest uppercase hover:bg-[#C6A35E] transition-colors"
                >
                    Start Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4] pt-28 pb-20"> {/* PT for fixed nav */}
            <div className="container mx-auto px-6 max-w-5xl">
                <h2 className="text-4xl font-serif font-bold mb-10 text-[#1A1A1A] border-b border-gray-200 pb-4">Shopping Bag</h2>
                
                {error && <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm border border-red-100">{error}</div>}

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Cart Items */}
                    <div className="flex-1">
                        <ul className="space-y-8">
                            {cart.map((item) => (
                                <li key={item.id} className="flex gap-6 pb-8 border-b border-gray-200 last:border-0 items-start">
                                    <div className="h-32 w-24 bg-gray-100 flex-shrink-0 cursor-pointer" onClick={() => navigate(`/search`)}>
                                         {item.image_url ? 
                                            <img src={item.image_url.startsWith('http') ? item.image_url : `http://localhost:5001/${item.image_url}`} alt={item.name} className="h-full w-full object-cover" /> 
                                            : <div className="h-full w-full flex items-center justify-center text-gray-300 text-xs">No Image</div>
                                         }
                                    </div>
                                    <div className="flex-1 flex flex-col h-32 justify-between">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-xl font-serif text-[#1A1A1A] cursor-pointer hover:text-[#C6A35E] transition-colors" onClick={() => navigate(`/search`)}>{item.name}</h3>
                                                <p className="text-lg font-medium text-[#1A1A1A] font-serif">${parseFloat(item.price).toFixed(2)}</p>
                                            </div>
                                            <p className="text-xs text-gray-400 tracking-widest uppercase mt-1">{item.vendor_name || 'EverShop'}</p>
                                        </div>
                                        
                                        <div className="flex justify-between items-end">
                                            {/* Minimalist Quantity */}
                                            <div className="flex items-center space-x-4 border border-gray-200 px-3 py-1.5 self-start bg-white">
                                                <button 
                                                    className="text-gray-400 hover:text-black transition-colors"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                ><MinusIcon className="h-3 w-3" /></button>
                                                <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                                <button 
                                                    className="text-gray-400 hover:text-black transition-colors"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                ><PlusIcon className="h-3 w-3" /></button>
                                            </div>
                                            
                                            <button 
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-xs text-gray-400 hover:text-red-500 uppercase tracking-widest underline transition-colors"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Summary Card */}
                    <div className="lg:w-96">
                        <div className="bg-white p-8 shadow-soft sticky top-32">
                            <h3 className="text-lg font-serif font-bold mb-6">Order Summary</h3>
                            <div className="space-y-4 mb-6 text-sm text-gray-600 font-sans">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>${cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping</span>
                                    <span>Calculated at checkout</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>$0.00</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-4 mb-8 flex justify-between items-center">
                                <span className="font-bold text-lg text-[#1A1A1A]">Total</span>
                                <span className="font-bold text-xl font-serif text-[#1A1A1A]">${cartTotal.toFixed(2)}</span>
                            </div>
                            
                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                className={`w-full py-4 text-white text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-lg ${
                                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#C6A35E] hover:bg-[#b08d4b] hover:shadow-xl'
                                }`}
                            >
                                {loading ? 'Processing...' : 'Proceed to Checkout'}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-wider">
                                Secure Checkout
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
