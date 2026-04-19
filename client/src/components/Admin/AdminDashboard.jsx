import React, { useState, useEffect } from 'react';
import { getVendors, approveVendor, rejectVendor, getSettings, updateSetting } from '../../api/axios';
import CategoryManager from './CategoryManager';
import { CheckIcon, XMarkIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const AdminDashboard = () => {
    const [vendors, setVendors] = useState([]);
    const [commission, setCommission] = useState('10');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [vRes, sRes] = await Promise.all([
                getVendors(),
                getSettings() // Assuming this exists now
            ]);
            
            // Filter only pending vendors for the "Requests" widget
            setVendors(vRes.data);
            if (sRes.data.commission_rate) setCommission(sRes.data.commission_rate);
            
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await approveVendor(id);
            loadData();
        } catch (err) {
            alert('Error');
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Reject and remove this vendor applicant?')) return;
        try {
            await rejectVendor(id);
            loadData();
        } catch (err) {
            alert('Error');
        }
    };

    const saveCommission = async () => {
        try {
            await updateSetting('commission_rate', commission);
            alert('Commission Rate Saved');
        } catch (err) {
            alert('Error saving settings');
        }
    };

    if (loading) return <div className="text-white">Loading Panel...</div>;

    const pendingVendors = vendors.filter(v => !v.is_approved && v.role === 'Vendor');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Vendor Requests (High Priority) */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-800">
                        <h3 className="text-lg font-bold text-white">Pending Vendor Requests</h3>
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">{pendingVendors.length} New</span>
                    </div>
                    
                    <div className="divide-y divide-gray-700">
                        {pendingVendors.length > 0 ? (
                            pendingVendors.map(vendor => (
                                <div key={vendor.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                                    <div>
                                        <p className="text-sm font-bold text-white">{vendor.name}</p>
                                        <p className="text-xs text-gray-400">{vendor.email}</p>
                                        <p className="text-xs text-gray-500 mt-1">Applied: {new Date(vendor.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => handleApprove(vendor.id)}
                                            className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded transition-colors"
                                            title="Approve"
                                        >
                                            <CheckIcon className="h-5 w-5" />
                                        </button>
                                        <button 
                                            onClick={() => handleReject(vendor.id)}
                                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded transition-colors"
                                            title="Reject"
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500 text-sm">No pending requests</div>
                        )}
                    </div>
                </div>

                {/* Active Vendors List */}
                <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden mt-8">
                    <div className="px-6 py-4 border-b border-gray-700">
                         <h3 className="text-lg font-bold text-white">Active Vendors</h3>
                    </div>
                    <div className="divide-y divide-gray-700">
                        {vendors.filter(v => v.role === 'Vendor' && v.is_approved).map(vendor => (
                             <div key={vendor.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors">
                                <div>
                                    <p className="text-sm font-bold text-white">{vendor.name}</p>
                                    <p className="text-xs text-gray-400">{vendor.email}</p>
                                </div>
                                <span className="bg-green-900 text-green-300 text-xs px-2 py-1 rounded-full">Verified</span>
                             </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Col: Widgets */}
            <div className="space-y-8">
                 {/* Commission Settings */}
                 <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div className="flex items-center mb-4 text-white">
                        <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-400" /> 
                        <h3 className="font-bold">Commission Settings</h3>
                    </div>
                    <div className="space-y-4">
                         <div>
                            <label className="block text-xs text-gray-400 mb-1">Global Fee (%)</label>
                            <div className="flex">
                                <input 
                                    type="number" 
                                    value={commission}
                                    onChange={(e) => setCommission(e.target.value)}
                                    className="flex-1 bg-gray-900 border border-gray-600 text-white rounded-l px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                                />
                                <button 
                                    onClick={saveCommission}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-r text-sm font-medium"
                                >
                                    Set
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">Applied to all vendor sales automatically.</p>
                         </div>
                    </div>
                 </div>

                 {/* Category Manager */}
                 <CategoryManager />
            </div>
        </div>
    );
};

export default AdminDashboard;
