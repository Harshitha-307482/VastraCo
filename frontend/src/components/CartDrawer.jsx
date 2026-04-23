import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { CartContext } from '../context/CartContext';

const CartDrawer = () => {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal } = useContext(CartContext);
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setIsCartOpen(false)} />
      
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md transform transition ease-in-out duration-500 sm:duration-700 translate-x-0">
          <div className="h-full flex flex-col bg-white shadow-xl">
            <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-heading font-semibold text-gray-900 flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5" /> Shopping Cart
                </h2>
                <div className="ml-3 h-7 flex items-center">
                  <button
                    type="button"
                    className="-m-2 p-2 text-gray-400 hover:text-gray-500"
                    onClick={() => setIsCartOpen(false)}
                  >
                    <span className="sr-only">Close panel</span>
                    <X className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-8">
                <div className="flow-root">
                  {cart.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-gray-500">Your cart is empty.</p>
                      <button 
                        onClick={() => {setIsCartOpen(false); navigate('/products');}}
                        className="mt-4 text-brand-accent hover:text-brand-dark font-medium"
                      >
                        Continue Shopping
                      </button>
                    </div>
                  ) : (
                    <ul role="list" className="-my-6 divide-y divide-gray-200">
                      {cart.map((item) => (
                        <li key={item.variant_id} className="py-6 flex">
                          <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
                            <img
                              src={item.image_url}
                              alt={item.product_name}
                              className="w-full h-full object-center object-cover"
                            />
                          </div>

                          <div className="ml-4 flex-1 flex flex-col">
                            <div>
                              <div className="flex justify-between text-base font-medium text-gray-900">
                                <h3>{item.product_name}</h3>
                                <p className="ml-4">₹{(item.unit_price * item.quantity).toFixed(2)}</p>
                              </div>
                              <p className="mt-1 text-sm text-gray-500">
                                {item.color} | {item.size}
                              </p>
                            </div>
                            <div className="flex-1 flex items-end justify-between text-sm">
                              <div className="flex items-center border border-gray-300 rounded">
                                <button 
                                  onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                                  className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="px-4 py-1 text-gray-900 font-medium">{item.quantity}</span>
                                <button 
                                  onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                                  className="px-2 py-1 text-gray-600 hover:bg-gray-100"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>

                              <div className="flex">
                                <button
                                  type="button"
                                  onClick={() => removeFromCart(item.variant_id)}
                                  className="font-medium text-red-600 hover:text-red-500"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 py-6 px-4 sm:px-6 bg-gray-50">
                <div className="flex justify-between text-base font-medium text-gray-900 mb-4">
                  <p>Subtotal</p>
                  <p>₹{cartTotal.toFixed(2)}</p>
                </div>
                <p className="mt-0.5 text-sm text-gray-500 mb-6">Shipping and taxes calculated at checkout.</p>
                <div className="mt-6">
                  <button
                    onClick={handleCheckout}
                    className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-brand-dark bg-brand-accent hover:bg-yellow-500 transition-colors"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
