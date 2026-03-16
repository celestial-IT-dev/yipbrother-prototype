import React from 'react';
import { Link } from 'react-router-dom';
import OrderList from '../components/orders/OrderList';

export default function OrdersPage() {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-subtitle">Manage and track all customer orders</div>
        </div>
        <Link to="/orders/new" className="btn btn-primary btn-modern">
          + New Order
        </Link>
      </div>
      <OrderList />
    </div>
  );
}
