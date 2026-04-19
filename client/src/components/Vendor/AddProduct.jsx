import React, { useState, useEffect } from 'react';
import { addProduct } from '../../api/axios';
import { useNavigate } from 'react-router-dom';

const AddProduct = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        stock_quantity: '',
        description: '',
        category: '',
        colors: '', // Comma separated
        sizes: '', // Comma separated
    });
    // Specs: Array of {label, value}
    const [specs, setSpecs] = useState([
        { label: "Material", value: "" },
        { label: "Warranty", value: "" },
        { label: "Origin", value: "" }
    ]);

    const [image, setImage] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Client-side role protection
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user || user.role !== 'Vendor') {
            alert('Access Denied: Vendors only.');
            navigate('/'); 
        }
    }, [navigate]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSpecChange = (index, field, value) => {
        const newSpecs = [...specs];
        newSpecs[index][field] = value;
        setSpecs(newSpecs);
    };

    const addSpecRow = () => {
        setSpecs([...specs, { label: "", value: "" }]);
    };

    const removeSpecRow = (index) => {
        const newSpecs = specs.filter((_, i) => i !== index);
        setSpecs(newSpecs);
    };

    const handleImageChange = (e) => {
        setImage(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.name || !formData.price || !formData.stock_quantity) {
            setError('Please fill in all required fields.');
            return;
        }

        const data = new FormData();
        data.append('name', formData.name);
        data.append('price', formData.price);
        data.append('stock_quantity', formData.stock_quantity);
        data.append('description', formData.description);
        data.append('category', formData.category);
        
        // Process Arrays/JSON
        const colorsArray = formData.colors.split(',').map(s => s.trim()).filter(Boolean);
        const sizesArray = formData.sizes.split(',').map(s => s.trim()).filter(Boolean);
        const validSpecs = specs.filter(s => s.label && s.value);

        data.append('colors', JSON.stringify(colorsArray));
        data.append('sizes', JSON.stringify(sizesArray));
        data.append('specs', JSON.stringify(validSpecs));

        if (image) {
            data.append('image', image);
        }

        try {
            await addProduct(data);
            setSuccess('Product added successfully!');
            setFormData({
                name: '',
                price: '',
                stock_quantity: '',
                description: '',
                category: '',
                colors: '',
                sizes: ''
            });
            setSpecs([
                { label: "Material", value: "" },
                { label: "Warranty", value: "" },
                { label: "Origin", value: "" }
            ]);
            setImage(null);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to add product');
        }
    };

    return (
        <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md mb-20">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Product</h2>
            
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input
                            type="text"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Price ($) *</label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                            min="0"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Stock Quantity *</label>
                        <input
                            type="number"
                            name="stock_quantity"
                            value={formData.stock_quantity}
                            onChange={handleChange}
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            required
                            min="0"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="4"
                        className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    ></textarea>
                </div>

                {/* Enhanced Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Colors (Comma separated)</label>
                        <input
                            type="text"
                            name="colors"
                            value={formData.colors}
                            onChange={handleChange}
                            placeholder="e.g. Red, Blue, Midnight Black"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sizes (Comma separated)</label>
                        <input
                            type="text"
                            name="sizes"
                            value={formData.sizes}
                            onChange={handleChange}
                            placeholder="e.g. S, M, L, XL"
                            className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Specs Section */}
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specifications</label>
                    {specs.map((spec, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Label (e.g. Material)"
                                value={spec.label}
                                onChange={(e) => handleSpecChange(index, 'label', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                            />
                            <input
                                type="text"
                                placeholder="Value (e.g. Leather)"
                                value={spec.value}
                                onChange={(e) => handleSpecChange(index, 'value', e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => removeSpecRow(index)}
                                className="text-red-500 hover:text-red-700"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addSpecRow}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                        + Add Specification
                    </button>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Product Image</label>
                    <input
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition duration-200"
                >
                    Add Product
                </button>
            </form>
        </div>
    );
};

export default AddProduct;
