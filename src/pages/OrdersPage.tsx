import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ROLES } from '../lib/constants';
import OrderList from '../components/orders/OrderList';

export default function OrdersPage() {
  const { profile } = useAuth();

  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Orders</div>
          <div className="page-subtitle">Manage and track all customer orders</div>
        </div>
        {profile?.role === ROLES.SALES && (
          <Link to="/orders/new" className="btn btn-primary btn-modern">
            + New Order
          </Link>
        )}
      </div>
      <OrderList />
    </div>
  );
}
