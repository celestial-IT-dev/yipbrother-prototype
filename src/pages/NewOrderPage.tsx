import { Card } from 'react-bootstrap';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { ROLES } from '../lib/constants';
import OrderForm from '../components/orders/OrderForm';

export default function NewOrderPage() {
  const { profile, loading } = useAuth();

  // Only Sales and Admin can create orders
  if (!loading && profile?.role !== ROLES.SALES && profile?.role !== ROLES.ADMIN) {
    return <Navigate to="/orders" replace />;
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="page-header">
        <div>
          <div className="page-title">New Order</div>
          <nav aria-label="breadcrumb" className="mt-1">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/orders" className="text-decoration-none">Orders</Link></li>
              <li className="breadcrumb-item active">New Order</li>
            </ol>
          </nav>
        </div>
      </div>
      <Card className="info-card">
        <Card.Body className="p-4">
          <OrderForm />
        </Card.Body>
      </Card>
    </div>
  );
}
