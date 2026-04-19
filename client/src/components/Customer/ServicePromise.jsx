import React from 'react';
import { TruckIcon, ShieldCheckIcon, CreditCardIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

const ServiceFeature = ({ icon: Icon, title, desc }) => (
    <div className="flex flex-col items-center text-center p-6 group hover:bg-[#252525] transition-colors rounded-sm cursor-default">
        <div className="mb-4 p-3 rounded-full border border-[#C6A35E]/30 group-hover:border-[#C6A35E] transition-colors">
            <Icon className="h-8 w-8 text-[#C6A35E]" />
        </div>
        <h4 className="font-serif text-lg font-medium text-white mb-2 tracking-wide">{title}</h4>
        <p className="text-xs text-gray-400 uppercase tracking-widest">{desc}</p>
    </div>
);

const ServicePromise = () => {
    return (
        <section className="bg-[#1A1A1A] border-y border-[#333]">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#333]">
                    <ServiceFeature 
                        icon={TruckIcon} 
                        title="Complimentary Shipping" 
                        desc="On Global Orders Over $500" 
                    />
                    <ServiceFeature 
                        icon={ShieldCheckIcon} 
                        title="Secure Transactions" 
                        desc="256-Bit SSL Encryption" 
                    />
                    <ServiceFeature 
                        icon={ChatBubbleLeftRightIcon} 
                        title="Concierge Service" 
                        desc="24/7 Dedicated Support" 
                    />
                    <ServiceFeature 
                        icon={CreditCardIcon} 
                        title="Buyer Protection" 
                        desc="Authenticity Guaranteed" 
                    />
                </div>
            </div>
        </section>
    );
};

export default ServicePromise;
