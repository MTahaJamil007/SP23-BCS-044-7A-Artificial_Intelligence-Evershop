import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, deleteCategory } from '../../api/axios';
import { PlusIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline';

const CategoryManager = () => {
    const [categories, setCategories] = useState([]);
    const [newCatName, setNewCatName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await getCategories();
            setCategories(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCatName.trim()) return;
        try {
            await createCategory({ name: newCatName });
            setNewCatName('');
            loadCategories();
        } catch (err) {
            alert('Failed to add category');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this category? Products might lose their category association.')) return;
        try {
            await deleteCategory(id);
            loadCategories();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    if (loading) return <div>Loading Categories...</div>;

    return (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center">
                    <TagIcon className="h-5 w-5 mr-2 text-red-500" /> Global Categories
                </h3>
            </div>

            <form onSubmit={handleAdd} className="flex gap-2 mb-6">
                <input 
                    type="text" 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="New Category Name..."
                    className="flex-1 bg-gray-900 border border-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                />
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">
                    <PlusIcon className="h-5 w-5" />
                </button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {categories.length > 0 ? (
                    categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center bg-gray-700/50 px-4 py-3 rounded border border-gray-700 group hover:border-gray-600">
                            <span className="text-gray-200 text-sm font-medium">{cat.name}</span>
                            <button onClick={() => handleDelete(cat.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-gray-500 text-sm italic text-center py-4">No categories defined</div>
                )}
            </div>
        </div>
    );
};

export default CategoryManager;
