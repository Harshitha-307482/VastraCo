import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { CartContext } from '../context/CartContext';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useContext(CartContext);
  const navigate = useNavigate();
  
  const [address, setAddress] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    if (cart.length === 0 && !success) {
      navigate('/cart');
    }
  }, [cart, navigate, success]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const orderPayload = {
        items: cart.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.product_name,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        shipping_address: address
      };

      const res = await api.post('/orders', orderPayload);
      setOrderId(res.data.id);
      setSuccess(true);
      clearCart();
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.error || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <CheckCircle className="h-24 w-24 text-green-500 mb-6" />
        <h2 className="text-3xl font-heading font-extrabold text-gray-900 mb-2">Order Confirmed!</h2>
        <p className="text-lg text-gray-600 mb-6">Thank you for shopping with VastraCo.</p>
        <div className="bg-gray-50 rounded-lg p-6 w-full max-w-md text-center border border-gray-200">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Order Reference</p>
          <p className="text-xl font-mono font-bold text-brand-dark mt-1">{orderId}</p>
        </div>
        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => navigate('/orders')}
            className="px-6 py-2 border border-brand-dark rounded-md text-brand-dark hover:bg-gray-50 transition-colors font-medium"
          >
            View Orders
          </button>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-2 bg-brand-accent text-brand-dark rounded-md hover:bg-yellow-500 transition-colors font-medium"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-gray-900 mb-8">Checkout</h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit}>
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">Shipping Address</h2>
              
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={address.name}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent sm:text-sm px-3 py-2 border"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700">Address Line 1</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="addressLine1"
                      name="addressLine1"
                      required
                      value={address.addressLine1}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent sm:text-sm px-3 py-2 border"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700">Address Line 2 (Optional)</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="addressLine2"
                      name="addressLine2"
                      value={address.addressLine2}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent sm:text-sm px-3 py-2 border"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      value={address.city}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent sm:text-sm px-3 py-2 border"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="state"
                      name="state"
                      required
                      value={address.state}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent sm:text-sm px-3 py-2 border"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="pincode" className="block text-sm font-medium text-gray-700">Pincode</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      required
                      value={address.pincode}
                      onChange={handleInputChange}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-brand-accent focus:border-brand-accent sm:text-sm px-3 py-2 border"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={loading || cart.length === 0}
                  className={`w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-brand-dark 
                    ${loading || cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-brand-accent hover:bg-yellow-500'} 
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors`}
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div className="mt-10 lg:mt-0 lg:col-span-5">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">Order Summary</h2>
            
            <ul role="list" className="divide-y divide-gray-200">
              {cart.map((item) => (
                <li key={item.variant_id} className="py-4 flex">
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="flex-none w-16 h-16 rounded-md object-center object-cover border border-gray-200"
                  />
                  <div className="ml-4 flex-auto">
                    <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                    <p className="text-sm text-gray-500">Color: {item.color} | Size: {item.size}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-base font-medium text-gray-900">₹{(item.unit_price * item.quantity).toFixed(2)}</p>
                </li>
              ))}
            </ul>

            <dl className="mt-6 space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">Subtotal</dt>
                <dd className="text-sm font-medium text-gray-900">₹{cartTotal.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-gray-600">Shipping</dt>
                <dd className="text-sm font-medium text-gray-900">Free</dd>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <dt className="text-base font-medium text-gray-900">Order total</dt>
                <dd className="text-base font-medium text-brand-dark">₹{cartTotal.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
