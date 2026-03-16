import { Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import OrderForm from '../components/orders/OrderForm';

export default function NewOrderPage() {
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
