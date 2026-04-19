import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 1. Not Logged In -> Login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // 2. LoggedIn but Wrong Role (e.g. Customer trying to access Admin)
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to their appropriate home
        if (user.role === 'Vendor') return <Navigate to="/vendor" replace />;
        if (user.role === 'Administrator') return <Navigate to="/admin" replace />;
        return <Navigate to="/" replace />; // Customer
    }

    // 3. Authorized
    return <Outlet />;
};

export default ProtectedRoute;
