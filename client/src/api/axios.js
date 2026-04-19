import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api',
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export const addProduct = async (productData) => {
    // productData should be a FormData object
    return await api.post('/products', productData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const getAllProducts = async () => {
    return await api.get('/products');
};

export const createOrder = async (orderData) => {
    return await api.post('/orders', orderData);
};

export const getVendors = async () => {
    return await api.get('/admin/vendors');
};

export const approveVendor = async (id) => {
    return await api.put(`/admin/approve-vendor/${id}`);
};

// Vendor API
export const getVendorStats = async () => {
    return await api.get('/vendor/stats');
};

export const getVendorProducts = async () => {
    return await api.get('/vendor/products');
};

export const getVendorOrders = async () => {
    return await api.get('/vendor/orders');
};

export const updateProduct = async (id, data) => {
    return await api.put(`/products/${id}`, data);
};

export const deleteProduct = async (id) => {
    return await api.delete(`/products/${id}`);
};

export const updateOrderStatus = async (id, status) => {
    return await api.put(`/orders/sub-orders/${id}/status`, { status });
};

// Admin API
export const rejectVendor = async (id) => {
    return await api.delete(`/admin/reject-vendor/${id}`);
};

export const getCategories = async () => {
    return await api.get('/admin/categories');
};

export const createCategory = async (data) => {
    return await api.post('/admin/categories', data);
};

export const deleteCategory = async (id) => {
    return await api.delete(`/admin/categories/${id}`);
};

export const getSettings = async () => {
    return await api.get('/admin/settings');
};

export const updateSetting = async (key, value) => {
    return await api.put('/admin/settings', { key, value });
};

export default api;
