import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import api from '../api/axios';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/orders');
        setOrders(res.data);
      } catch (err) {
        setError('Failed to fetch orders');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <div className="flex justify-center py-20">Loading orders...</div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;

  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-heading font-bold text-gray-900 mb-8">My Orders</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No orders yet</h3>
          <p className="mt-1 text-gray-500">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-5 border-b border-gray-200 sm:px-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Order ID</p>
                  <p className="font-mono text-sm mt-1">{order.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date Placed</p>
                  <p className="text-sm mt-1">{new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">₹{Number(order.total_amount).toFixed(2)}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
              
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-base font-medium text-gray-900 mb-4">Items</h4>
                <ul role="list" className="divide-y divide-gray-200 border-t border-b border-gray-200">
                  {order.items.map((item) => (
                    <li key={item.id} className="py-4 flex items-center justify-between text-sm">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{item.product_name}</span>
                        <span className="text-gray-500 mt-1">Color: {item.color} | Size: {item.size}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 font-medium">₹{Number(item.unit_price).toFixed(2)}</p>
                        <p className="text-gray-500 mt-1">Qty: {item.quantity}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-6">
                  <h4 className="text-base font-medium text-gray-900 mb-2">Shipping Address</h4>
                  <address className="not-italic text-sm text-gray-600">
                    <span className="block">{order.shipping_address.name}</span>
                    <span className="block">{order.shipping_address.addressLine1}</span>
                    {order.shipping_address.addressLine2 && <span className="block">{order.shipping_address.addressLine2}</span>}
                    <span className="block">{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}</span>
                  </address>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
