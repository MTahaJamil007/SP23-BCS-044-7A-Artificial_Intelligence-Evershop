import React from 'react';
import { ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';

const EmptyState = ({ 
    title = "No Items Found", 
    description = "We couldn't find what you were looking for.", 
    actionLabel, 
    onAction 
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ArchiveBoxXMarkIcon className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-serif font-medium text-[#1A1A1A] mb-2">{title}</h3>
            <p className="text-gray-500 max-w-sm mb-8 font-light">{description}</p>
            {actionLabel && onAction && (
                <button 
                    onClick={onAction}
                    className="px-8 py-3 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#C6A35E] transition-colors shadow-lg"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
