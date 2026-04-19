import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', formData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            
            // Redirect based on role
            if (res.data.user.role === 'Vendor') navigate('/vendor/add-product');
            else if (res.data.user.role === 'Administrator') navigate('/admin');
            else navigate('/');
            
            window.location.reload(); // Refresh to update Navbar
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden p-8 space-y-6">
                <div className="text-center relative">
                    <Link to="/" className="absolute left-0 top-0 text-gray-500 hover:text-indigo-600 text-sm">
                        &larr; Home
                    </Link>
                    <h2 className="text-3xl font-extrabold text-gray-900">Welcome Back</h2>
                    <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
                </div>
                
                {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-center">{error}</div>}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            required
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            placeholder="you@example.com"
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            name="password"
                            required
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            placeholder="••••••••"
                            onChange={handleChange}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition duration-300 transform hover:-translate-y-0.5"
                    >
                        Sign In
                    </button>
                </form>

                <div className="text-center text-sm text-gray-600">
                    Don't have an account? <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">Sign up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
