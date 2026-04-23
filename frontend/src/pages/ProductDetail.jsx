import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import api from '../api/axios';
import { CartContext } from '../context/CartContext';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/products/${id}`);
        setProduct(res.data);
        
        if (res.data.variants && res.data.variants.length > 0) {
          // Extract unique colors and sizes
          const colors = [...new Set(res.data.variants.map(v => v.color))];
          const sizes = [...new Set(res.data.variants.map(v => v.size))];
          
          setAvailableColors(colors);
          setAvailableSizes(sizes);
          
          if (colors.length > 0) setSelectedColor(colors[0]);
          if (sizes.length > 0) setSelectedSize(sizes[0]);
        }
      } catch (error) {
        console.error('Error fetching product', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (!product) return <div className="text-center py-20">Product not found</div>;

  // Find the exact variant selected to check stock
  const selectedVariant = product.variants?.find(
    v => v.color === selectedColor && v.size === selectedSize
  );

  const handleAddToCart = () => {
    if (selectedVariant && selectedVariant.stock_quantity > 0) {
      addToCart(product, selectedVariant);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/products" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-brand-dark mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to products
      </Link>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 xl:gap-x-16">
        {/* Product Image */}
        <div className="lg:max-w-lg lg:self-end">
          <div className="aspect-[4/5] rounded-lg overflow-hidden bg-gray-100">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-center object-cover"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="mt-10 px-4 sm:px-0 sm:mt-16 lg:mt-0">
          <h1 className="text-3xl font-heading font-extrabold tracking-tight text-gray-900">{product.name}</h1>
          
          <div className="mt-3">
            <h2 className="sr-only">Product information</h2>
            <p className="text-2xl font-semibold text-brand-dark">₹{Number(product.price).toFixed(2)}</p>
          </div>
          
          <div className="mt-3">
            <p className="text-sm text-gray-500">Brand: <span className="font-medium text-gray-900">{product.brand}</span></p>
            <p className="text-sm text-gray-500 mt-1">Category: <span className="font-medium text-gray-900">{product.category_name}</span></p>
          </div>

          <div className="mt-6">
            <h3 className="sr-only">Description</h3>
            <div className="text-base text-gray-700 space-y-6">
              <p>{product.description}</p>
            </div>
          </div>

          <div className="mt-8">
            {/* Color selector */}
            {availableColors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900">Color</h3>
                <div className="mt-2 flex items-center space-x-3">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 border rounded-md text-sm font-medium focus:outline-none 
                        ${selectedColor === color 
                          ? 'border-brand-dark bg-brand-dark text-white' 
                          : 'border-gray-300 text-gray-900 hover:bg-gray-50'}`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selector */}
            {availableSizes.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between">
                  <h3 className="text-sm font-medium text-gray-900">Size</h3>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {availableSizes.map((size) => {
                    const variantExists = product.variants.some(v => v.color === selectedColor && v.size === size);
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        disabled={!variantExists}
                        className={`border rounded-md py-2 px-3 flex items-center justify-center text-sm font-medium uppercase sm:flex-1 focus:outline-none
                          ${selectedSize === size 
                            ? 'border-brand-dark bg-brand-dark text-white' 
                            : variantExists 
                              ? 'border-gray-300 text-gray-900 hover:bg-gray-50' 
                              : 'border-gray-200 text-gray-300 cursor-not-allowed opacity-50'}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className={`text-sm ${selectedVariant?.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {selectedVariant 
                  ? selectedVariant.stock_quantity > 0 
                    ? `In Stock (${selectedVariant.stock_quantity} available)` 
                    : 'Out of Stock'
                  : 'Please select valid color and size'}
              </p>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.stock_quantity <= 0}
                className={`max-w-xs flex-1 border border-transparent rounded-md py-3 px-8 flex items-center justify-center text-base font-medium text-brand-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-brand-accent sm:w-full
                  ${(!selectedVariant || selectedVariant.stock_quantity <= 0) 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-brand-accent hover:bg-yellow-500'}`}
              >
                <ShoppingBag className="mr-2 h-5 w-5" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
