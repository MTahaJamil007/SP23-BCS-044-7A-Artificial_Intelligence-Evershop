import React from 'react';

const ProductCardSkeleton = () => {
    return (
        <div className="flex flex-col h-full rounded-sm border border-transparent">
            {/* Image Area Skeleton */}
            <div className="relative aspect-[4/5] bg-gray-100 overflow-hidden animate-pulse">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 shimmer" />
            </div>

            {/* Content Area Skeleton */}
            <div className="flex-grow flex flex-col p-5 text-center items-center space-y-3">
                {/* Category & Title */}
                <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                
                {/* Rating */}
                <div className="flex gap-1 justify-center py-1">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-3 w-3 bg-gray-100 rounded-full animate-pulse" />
                    ))}
                </div>

                {/* Price */}
                <div className="mt-auto pt-2">
                     <div className="h-6 w-20 bg-gray-100 rounded animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export default ProductCardSkeleton;
