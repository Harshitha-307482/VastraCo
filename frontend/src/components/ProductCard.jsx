import React from 'react';
import { Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
  return (
    <div className="group relative bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300">
      <Link to={`/products/${product.id}`}>
        <div className="aspect-[4/5] overflow-hidden bg-gray-100">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      </Link>
      <div className="p-4">
        <p className="text-xs text-gray-500 mb-1">{product.brand}</p>
        <h3 className="text-sm font-medium text-gray-900 mb-2 truncate">
          <Link to={`/products/${product.id}`}>
            {product.name}
          </Link>
        </h3>
        <p className="text-lg font-semibold text-brand-dark">₹{Number(product.price).toFixed(2)}</p>
      </div>
    </div>
  );
};

export default ProductCard;
