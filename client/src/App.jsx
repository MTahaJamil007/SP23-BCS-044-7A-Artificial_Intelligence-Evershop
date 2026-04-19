import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import ProductGrid from './components/Customer/ProductGrid';
import Cart from './components/Customer/Cart';
import SearchPage from './components/Customer/SearchPage';
import HomePage from './components/Customer/HomePage';
import ProductDetailLuxury from './components/Customer/ProductDetailLuxury';
import CustomerDashboard from './components/Customer/CustomerDashboard';
import VendorStoreFront from './components/Customer/VendorStoreFront';
import FashionPage from './components/Customer/CategoryPages/FashionPage';
import ElectronicsPage from './components/Customer/CategoryPages/ElectronicsPage';

// Auth
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Vendor
import VendorLayout from './components/Vendor/VendorLayout';
import VendorDashboard from './components/Vendor/VendorDashboard';
import AddProduct from './components/Vendor/AddProduct';

// Admin
import AdminLayout from './components/Admin/AdminLayout';
import AdminDashboard from './components/Admin/AdminDashboard';
import CategoryManager from './components/Admin/CategoryManager';

function App() {
  return (
    <Router>
      <CartProvider>
         <Routes>
            {/* Public Routes */}
            <Route path="/" element={<><Navbar /><HomePage /><Footer /></>} />
            <Route path="/search" element={<><Navbar /><SearchPage /><Footer /></>} />
            <Route path="/product/:id" element={<><Navbar /><ProductDetailLuxury /><Footer /></>} />
            <Route path="/cart" element={<><Navbar /><Cart /><Footer /></>} />
            <Route path="/store/:vendorId" element={<><Navbar /><VendorStoreFront /><Footer /></>} />
            <Route path="/category/fashion" element={<><Navbar /><FashionPage /><Footer /></>} />
            <Route path="/category/electronics" element={<><Navbar /><ElectronicsPage /><Footer /></>} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Customer Protected Route */}
            <Route path="/account" element={<ProtectedRoute allowedRoles={['Customer', 'Vendor', 'Administrator']} />}>
                 <Route index element={<><Navbar /><CustomerDashboard /><Footer /></>} />
            </Route>

            {/* Admin Routes (Protected) */}
            <Route element={<ProtectedRoute allowedRoles={['Administrator']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<AdminDashboard />} />
                    <Route path="categories" element={<CategoryManager />} />
                    <Route path="settings" element={<AdminDashboard />} />
                </Route>
            </Route>

            {/* Vendor Routes (Protected) */}
            <Route element={<ProtectedRoute allowedRoles={['Vendor', 'Administrator']} />}>
                 <Route path="/vendor" element={<VendorLayout />}>
                    <Route index element={<VendorDashboard />} />
                    <Route path="dashboard" element={<VendorDashboard />} />
                    <Route path="add-product" element={<AddProduct />} />
                    <Route path="products" element={<VendorDashboard />} />
                    <Route path="orders" element={<VendorDashboard />} />
                </Route>
            </Route>
         </Routes>
      </CartProvider>
    </Router>
  );
}

const Footer = () => (
    <footer className="bg-[#1A1A1A] text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
                <h4 className="font-serif text-xl font-bold mb-4">EverShop</h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                    Curating the world's finest luxury goods for the discerning individual.
                </p>
            </div>
            <div>
                <h5 className="font-bold text-sm uppercase tracking-widest mb-4 text-[#C6A35E]">Shop</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                    <li>New Arrivals</li>
                    <li>Best Sellers</li>
                    <li>Exclusives</li>
                </ul>
            </div>
            <div>
                <h5 className="font-bold text-sm uppercase tracking-widest mb-4 text-[#C6A35E]">Support</h5>
                <ul className="space-y-2 text-sm text-gray-400">
                    <li>FAQ</li>
                    <li>Shipping & Returns</li>
                    <li>Contact Us</li>
                </ul>
            </div>
            <div>
                <h5 className="font-bold text-sm uppercase tracking-widest mb-4 text-[#C6A35E]">Stay Connected</h5>
                <p className="text-sm text-gray-400 mb-4">Subscribe for exclusive drops.</p>
                <div className="flex border-b border-gray-600 pb-2">
                    <input type="email" placeholder="Email Address" className="bg-transparent border-none text-white w-full focus:ring-0 text-sm" />
                    <button className="text-[#C6A35E] uppercase text-xs font-bold tracking-widest">Join</button>
                </div>
            </div>
        </div>
        <div className="mt-12 text-center text-xs text-gray-600 border-t border-gray-800 pt-6">
            &copy; {new Date().getFullYear()} EverShop Luxury Marketplace.
        </div>
    </footer>
);

export default App;
