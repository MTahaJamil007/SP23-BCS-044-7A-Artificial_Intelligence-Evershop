import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { 
    StarIcon, 
    HeartIcon, 
    MinusIcon, 
    PlusIcon, 
    ChevronDownIcon, 
    ShieldCheckIcon 
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

const ProductDetailLuxury = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [activeColor, setActiveColor] = useState(0);
    const [activeSize, setActiveSize] = useState(0);
    const [openAccordion, setOpenAccordion] = useState('desc');
    const [inWishlist, setInWishlist] = useState(false);

    const handleWishlistToggle = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const res = await fetch(`http://localhost:5001/api/social/wishlist/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInWishlist(data.inWishlist);
            }
        } catch (err) {
            alert("Failed to update wishlist");
        }
    };

    // Fetch Product Data & Reviews
    useEffect(() => {
        const fetchProductAndReviews = async () => {
            try {
                // 1. Fetch Product
                const prodRes = await fetch(`http://localhost:5001/api/products/${id}`);
                if (!prodRes.ok) throw new Error('Product not found');
                const data = await prodRes.json();
                
                // 2. Fetch Reviews (Fail silently if reviews fail, don't crash page)
                let reviewsData = [];
                try {
                    const revRes = await fetch(`http://localhost:5001/api/reviews/${id}`);
                    if (revRes.ok) {
                        const json = await revRes.json();
                        if (Array.isArray(json)) {
                            reviewsData = json;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to load reviews", e);
                }

                setProduct({
                    ...data,
                    // Handle Images
                    images: data.image_url ? [data.image_url.startsWith('http') ? data.image_url : `http://localhost:5001/${data.image_url}`, "https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"] : ["https://via.placeholder.com/800"], 
                    // Real Specs or Fallback
                    specs: (data.specs && data.specs.length > 0) ? data.specs : [
                        { label: "Material", value: "Premium Composite" },
                        { label: "Warranty", value: "2 Year Global" },
                        { label: "Origin", value: "Imported" }
                    ],
                    // Real Reviews safely mapped
                    reviews: reviewsData.map(r => ({
                        id: r.id, 
                        user: r.user_name || "Verified Customer", 
                        date: r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recently', 
                        rating: Number(r.rating), 
                        text: r.comment, 
                        verified: true 
                    })),
                    // Real Colors or Fallback
                    colors: (data.colors && data.colors.length > 0) ? data.colors : ["Standard", "Midnight Edition"],
                    // Real Sizes or Fallback
                    sizes: (data.sizes && data.sizes.length > 0) ? data.sizes : ["Default Configuration"],
                    title: data.name, 
                    vendor: data.vendor_name || "EverShop Collection"
                });
            } catch (err) {
                console.error("Failed to fetch product:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProductAndReviews();
    }, [id]);

    useEffect(() => {
        const checkWishlistStatus = async () => {
            const token = localStorage.getItem('token');
            if (!token || !id) return;
            try {
                const res = await fetch(`http://localhost:5001/api/social/in-wishlist/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setInWishlist(data.inWishlist);
                }
            } catch (err) {
                console.error("Failed to check wishlist", err);
            }
        };
        checkWishlistStatus();
    }, [id]);

    const toggleAccordion = (section) => {
        setOpenAccordion(openAccordion === section ? null : section);
    };

    const handleAddToCart = () => {
        if (!product) return;
        addToCart({
            id: product.id,
            name: product.title,
            price: Number(product.price),
            image_url: product.images[0],
            vendor_name: product.vendor,
            quantity: quantity 
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C6A35E]"></div>
            </div>
        );
    }

    if (!product) {
        return (
             <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center flex-col">
                <h2 className="text-2xl font-serif text-[#1A1A1A]">Product Not Found</h2>
                <button onClick={() => navigate('/search')} className="mt-4 text-[#C6A35E] underline">Return to Shop</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F7F4] font-sans text-[#1A1A1A] pt-20">
            <div className="flex flex-col lg:flex-row">
                
                {/* Left Column: Sticky Gallery */}
                <div className="lg:w-3/5 relative bg-white">
                    <div className="sticky top-20 h-[calc(100vh-5rem)] overflow-hidden flex flex-col">
                        <div className="flex-1 relative cursor-zoom-in">
                            <img 
                                src={product.images[selectedImage]} 
                                alt={product.title} 
                                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
                            />
                        </div>
                        {/* Thumbnails */}
                        <div className="p-6 flex gap-4 overflow-x-auto justify-center bg-white border-t border-gray-100">
                            {product.images.map((img, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => setSelectedImage(idx)}
                                    className={`relative w-24 h-24 flex-shrink-0 overflow-hidden border-2 transition-all ${
                                        selectedImage === idx ? 'border-[#C6A35E]' : 'border-transparent hover:border-gray-200'
                                    }`}
                                >
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Scrollable Details */}
                <div className="lg:w-2/5 px-8 lg:px-16 py-12 lg:py-20 lg:min-h-screen overflow-y-auto">
                    
                    {/* Header */}
                    <div className="mb-10">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
                                Crafted by <Link to={`/store/${product.vendor_id}`} className="text-[#1A1A1A] font-bold hover:text-[#C6A35E] transition-colors">{product.vendor}</Link>
                            </p>
                            <div className="flex items-center space-x-1 text-[#C6A35E]">
                                <StarIconSolid className="h-4 w-4" />
                                <span className="text-sm font-medium text-[#1A1A1A]">4.8</span>
                                <span className="text-xs text-gray-400 border-b border-gray-300 ml-1 cursor-pointer hover:text-[#C6A35E] hover:border-[#C6A35E] transition-colors">
                                    (128 Reviews)
                                </span>
                            </div>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-[#1A1A1A] leading-tight mb-4">
                            {product.title}
                        </h1>
                        <p className="text-2xl font-medium text-[#1A1A1A]">
                            ${product.price.toLocaleString()}
                        </p>
                    </div>

                    {/* Selectors */}
                    <div className="space-y-6 mb-10 border-t border-gray-100 pt-8">
                        {/* Colors */}
                        <div>
                            <span className="text-sm font-bold uppercase tracking-wider mb-3 block">Axial Color</span>
                            <div className="flex flex-wrap gap-3">
                                {product.colors && product.colors.map((color, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveColor(idx)}
                                        className={`px-6 py-2 border text-sm transition-all ${
                                            activeColor === idx 
                                            ? 'border-[#C6A35E] bg-[#C6A35E] text-white' 
                                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sizes/Bundles */}
                        <div>
                            <span className="text-sm font-bold uppercase tracking-wider mb-3 block">Configuration</span>
                            <div className="flex flex-wrap gap-3">
                                {product.sizes && product.sizes.map((size, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveSize(idx)}
                                        className={`px-6 py-2 border text-sm transition-all ${
                                            activeSize === idx 
                                            ? 'border-[#1A1A1A] bg-[#1A1A1A] text-white' 
                                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
                                        }`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mb-12">
                         {/* Quantity */}
                         <div className="flex items-center border border-gray-300 h-12 w-32 justify-between px-4 bg-white">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-400 hover:text-black transition-colors"><MinusIcon className="h-4 w-4" /></button>
                            <span className="font-medium">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="text-gray-400 hover:text-black transition-colors"><PlusIcon className="h-4 w-4" /></button>
                         </div>

                        {/* Add to Cart */}
                        <button 
                            onClick={handleAddToCart}
                            className="flex-1 h-12 bg-[#C6A35E] text-white text-sm font-bold uppercase tracking-[0.15em] hover:bg-[#b08d4b] transition-all shadow-lg hover:shadow-xl"
                        >
                            Add to Bag
                        </button>


                        
                        {/* Wishlist */}
                        <button 
                            onClick={handleWishlistToggle}
                            className={`h-12 w-12 border flex items-center justify-center transition-colors ${
                                inWishlist 
                                ? 'border-red-500 text-red-500' 
                                : 'border-gray-300 text-gray-400 hover:text-red-500 hover:border-red-500'
                            }`}
                        >
                            {inWishlist ? <HeartIconSolid className="h-6 w-6" /> : <HeartIcon className="h-6 w-6" />}
                        </button>
                    </div>

                    {/* Accordions */}
                    <div className="border-t border-gray-200 divide-y divide-gray-200 mb-16">
                        {/* Description */}
                        <div>
                            <button onClick={() => toggleAccordion('desc')} className="w-full py-4 flex justify-between items-center group">
                                <span className="font-serif text-lg font-medium group-hover:text-[#C6A35E] transition-colors">Description</span>
                                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${openAccordion === 'desc' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openAccordion === 'desc' ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
                                <p className="text-gray-600 leading-relaxed">
                                    {product.description}
                                </p>
                            </div>
                        </div>

                         {/* Specs */}
                         <div>
                            <button onClick={() => toggleAccordion('specs')} className="w-full py-4 flex justify-between items-center group">
                                <span className="font-serif text-lg font-medium group-hover:text-[#C6A35E] transition-colors">Specifications</span>
                                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${openAccordion === 'specs' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openAccordion === 'specs' ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
                                <ul className="space-y-4">
                                    {product.specs.map((spec, i) => (
                                        <li key={i} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0">
                                            <span className="text-gray-500">{spec.label}</span>
                                            <span className="font-medium text-[#1A1A1A]">{spec.value}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                         {/* Shipping */}
                         <div>
                            <button onClick={() => toggleAccordion('shipping')} className="w-full py-4 flex justify-between items-center group">
                                <span className="font-serif text-lg font-medium group-hover:text-[#C6A35E] transition-colors">Shipping & Returns</span>
                                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${openAccordion === 'shipping' ? 'rotate-180' : ''}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openAccordion === 'shipping' ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'}`}>
                                <p className="text-gray-600 text-sm leading-relaxed mb-2">
                                    Complimentary global shipping on all orders over $500.
                                </p>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    We accept returns within 30 days of delivery. Merch must be in pristine condition with original packaging.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <div className="pt-10 border-t border-gray-200">
                        <h3 className="text-2xl font-serif font-bold mb-8">Client Reviews</h3>
                        
                        {/* Summary */}
                        <div className="flex items-center gap-8 mb-10 bg-white p-6 rounded-sm shadow-soft">
                            <div className="text-center">
                                <div className="text-5xl font-serif font-bold text-[#1A1A1A]">4.8</div>
                                <div className="flex text-[#C6A35E] gap-0.5 justify-center my-2">
                                    {[1,2,3,4,5].map(s => <StarIconSolid key={s} className="h-4 w-4" />)}
                                </div>
                                <div className="text-xs text-gray-400 uppercase tracking-wide">Based on 128 Reviews</div>
                            </div>
                            <div className="flex-1 w-full space-y-2">
                                {[5,4,3,2,1].map((r, i) => (
                                    <div key={r} className="flex items-center gap-3 text-xs">
                                        <span className="w-3">{r}</span>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#1A1A1A]" 
                                                style={{ width: ['75%', '15%', '8%', '1%', '1%'][i] }} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-8">
                            {product.reviews.map(review => (
                                <div key={review.id} className="pb-8 border-b border-gray-100 last:border-0">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                                                {review.user.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-[#1A1A1A]">{review.user}</h4>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex text-[#C6A35E] h-3 w-3">
                                                        {[...Array(review.rating)].map((_, i) => <StarIconSolid key={i} />)}
                                                    </div>
                                                    {review.verified && (
                                                        <span className="flex items-center text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                                            <ShieldCheckIcon className="h-3 w-3 mr-1" /> Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">{review.date}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed pl-13">"{review.text}"</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProductDetailLuxury;
