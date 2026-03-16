import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '../lib/supabaseClient';
import type { Order } from '../lib/types';
import OrderForm from '../components/orders/OrderForm';

export default function EditOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase.from('orders').select('*').eq('id', id).single();
      setOrder(data);
      setLoading(false);
    }
    if (id) fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="spinner-center"><Spinner animation="border" variant="primary" /></div>
    );
  }

  if (!order) return <Alert variant="danger">Order not found.</Alert>;

  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Edit Order</div>
          <nav aria-label="breadcrumb" className="mt-1">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><Link to="/orders" className="text-decoration-none">Orders</Link></li>
              <li className="breadcrumb-item">
                <Link to={`/orders/${id}`} className="text-decoration-none">{order.order_number}</Link>
              </li>
              <li className="breadcrumb-item active">Edit</li>
            </ol>
          </nav>
        </div>
      </div>
      <Card className="info-card">
        <Card.Body className="p-4">
          <OrderForm existingOrder={order} orderId={id} />
        </Card.Body>
      </Card>
    </div>
  );
}
