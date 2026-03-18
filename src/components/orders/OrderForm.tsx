import React, { useState } from 'react';
import { Form, Button, Row, Col, Alert, Card, Badge, ProgressBar } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/useAuth';
import { STATUSES, LOCKED_FROM_EDIT_STATUSES } from '../../lib/constants';
import type { Order } from '../../lib/types';

interface OrderFormData {
  customer_name: string;
  contact_person: string;
  phone: string;
  email: string;
  company_name: string;
  vehicle_reg: string;
  chassis_number: string;
  vehicle_model: string;
  vehicle_type: string;
  body_type: string;
  dimensions: string;
  special_requirements: string;
  production_notes: string;
  target_completion_date: string;
  payment_remarks: string;
}

const empty: OrderFormData = {
  customer_name: '', contact_person: '', phone: '', email: '', company_name: '',
  vehicle_reg: '', chassis_number: '', vehicle_model: '', vehicle_type: '',
  body_type: '', dimensions: '', special_requirements: '', production_notes: '',
  target_completion_date: '', payment_remarks: '',
};

interface Props {
  existingOrder?: Order | null;
  orderId?: string;
}

const STEP_TITLES = [
  'Customer Information',
  'Vehicle / Chassis Information',
  'Manufacturing Information',
  'Additional Information',
];

const STEP_FIELDS: Partial<Record<number, (keyof OrderFormData)[]>> = {
  1: ['customer_name'],
  3: ['target_completion_date'],
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function OrderForm({ existingOrder, orderId }: Props) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OrderFormData>(existingOrder ? {
    customer_name: existingOrder.customer_name || '',
    contact_person: existingOrder.contact_person || '',
    phone: existingOrder.phone || '',
    email: existingOrder.email || '',
    company_name: existingOrder.company_name || '',
    vehicle_reg: existingOrder.vehicle_reg || '',
    chassis_number: existingOrder.chassis_number || '',
    vehicle_model: existingOrder.vehicle_model || '',
    vehicle_type: existingOrder.vehicle_type || '',
    body_type: existingOrder.body_type || '',
    dimensions: existingOrder.dimensions || '',
    special_requirements: existingOrder.special_requirements || '',
    production_notes: existingOrder.production_notes || '',
    target_completion_date: existingOrder.target_completion_date || '',
    payment_remarks: existingOrder.payment_remarks || '',
  } : empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check if order is locked from editing
  const isLocked = existingOrder ? LOCKED_FROM_EDIT_STATUSES.includes(existingOrder.current_status as any) : false;
  const totalSteps = STEP_TITLES.length;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    // Clear field error when user starts typing
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};
    
    if (!form.customer_name.trim()) {
      errors.customer_name = 'Customer name is required.';
    }
    if (!form.target_completion_date.trim()) {
      errors.target_completion_date = 'Target completion date is required.';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep(stepToValidate: number): boolean {
    const errors: Record<string, string> = {};

    if (stepToValidate === 1 && !form.customer_name.trim()) {
      errors.customer_name = 'Customer name is required.';
    }

    if (stepToValidate === 3 && !form.target_completion_date.trim()) {
      errors.target_completion_date = 'Target completion date is required.';
    }

    const stepFields = STEP_FIELDS[stepToValidate] || [];
    setFieldErrors(prev => {
      const nextErrors = { ...prev };
      stepFields.forEach((field) => {
        delete nextErrors[field];
      });
      return { ...nextErrors, ...errors };
    });

    return Object.keys(errors).length === 0;
  }

  function handleNextStep() {
    if (!isLocked && !validateStep(step)) {
      return;
    }

    setStep(prev => Math.min(prev + 1, totalSteps));
  }

  function handlePreviousStep() {
    setStep(prev => Math.max(prev - 1, 1));
  }

  async function generateOrderNumber() {
    const date = new Date();
    const prefix = `YB-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
      .like('order_number', `${prefix}%`);
    return `${prefix}-${String((count || 0) + 1).padStart(3, '0')}`;
  }

  async function handleSubmit(status: 'Draft' | 'submit') {
    if (status === 'submit' && !validateForm()) {
      return;
    }
    if (status === 'Draft' && !form.customer_name.trim()) {
      setFieldErrors({ customer_name: 'Customer name is required.' });
      return;
    }
    
    setError('');
    setSaving(true);
    try {
      const orderStatus = status === 'Draft' ? STATUSES.DRAFT : STATUSES.PENDING_CUSTOMER_CONFIRMATION;
      if (orderId && existingOrder) {
        // Update
        const { error: err } = await supabase.from('orders').update({
          ...form,
          updated_at: new Date().toISOString(),
        }).eq('id', orderId);
        if (err) throw err;
        navigate(`/orders/${orderId}`);
      } else {
        // Create
        const orderNumber = await generateOrderNumber();
        const { data, error: err } = await supabase.from('orders').insert({
          ...form,
          order_number: orderNumber,
          current_status: orderStatus,
          salesperson_id: profile?.id,
        }).select().single();
        if (err) throw err;
        // Create initial history entry
        await supabase.from('order_status_history').insert({
          order_id: data.id,
          previous_status: null,
          new_status: orderStatus,
          changed_by: profile?.id,
          remark: status === 'Draft' ? 'Order created as Draft' : 'Order created and submitted',
        });
        navigate(`/orders/${data.id}`);
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to save order.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form>
      {error && <Alert variant="danger">{error}</Alert>}
      
      {isLocked && (
        <Alert variant="info" className="mb-4">
          <strong>Order Locked:</strong> This order cannot be edited because it has reached the "{existingOrder?.current_status}" status. 
          Orders cannot be edited after "Pending Payment" status. Please contact support if you need to make changes.
        </Alert>
      )}

      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <div>
              <div className="text-muted small">Step {step} of {totalSteps}</div>
              <div className="fw-semibold">{STEP_TITLES[step - 1]}</div>
            </div>
            <Badge bg="secondary">{Math.round((step / totalSteps) * 100)}%</Badge>
          </div>
          <ProgressBar className="mt-3" now={(step / totalSteps) * 100} />
        </Card.Body>
      </Card>

      {step === 1 && (
        <Card className="mb-3">
          <Card.Header className="bg-primary text-dark fw-semibold">Customer Information</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Customer Name <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    name="customer_name" 
                    value={form.customer_name} 
                    onChange={handleChange} 
                    placeholder="Customer Name"
                    isInvalid={!!fieldErrors.customer_name}
                    disabled={isLocked}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.customer_name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Company Name</Form.Label>
                  <Form.Control name="company_name" placeholder="Company Name" value={form.company_name} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Contact Person</Form.Label>
                  <Form.Control name="contact_person" placeholder="Contact Person" value={form.contact_person} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Phone</Form.Label>
                  <Form.Control name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Email</Form.Label>
                  <Form.Control name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {step === 2 && (
        <Card className="mb-3">
          <Card.Header className="bg-primary text-dark fw-semibold">Vehicle / Chassis Information</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Vehicle Reg. No.</Form.Label>
                  <Form.Control name="vehicle_reg" placeholder="Vehicle Registration Number" value={form.vehicle_reg} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Chassis Number</Form.Label>
                  <Form.Control name="chassis_number" placeholder="Chassis Number" value={form.chassis_number} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Vehicle Model</Form.Label>
                  <Form.Control name="vehicle_model" placeholder="Vehicle Model" value={form.vehicle_model} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Vehicle Type</Form.Label>
                  <Form.Control name="vehicle_type" placeholder="e.g. Lorry, Truck" value={form.vehicle_type} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {step === 3 && (
        <Card className="mb-3">
          <Card.Header className="bg-primary text-dark fw-semibold">Manufacturing Information</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Body Type</Form.Label>
                  <Form.Control name="body_type" value={form.body_type} onChange={handleChange} placeholder="e.g. Flatbed, Box, Tipper" disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Dimensions</Form.Label>
                  <Form.Control name="dimensions" value={form.dimensions} onChange={handleChange} placeholder="e.g. 20ft x 8ft x 7ft" disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Target Completion Date <span className="text-danger">*</span></Form.Label>
                  <Form.Control 
                    name="target_completion_date" 
                    type="date" 
                    value={form.target_completion_date} 
                    onChange={handleChange}
                    isInvalid={!!fieldErrors.target_completion_date}
                    disabled={isLocked}
                  />
                  <Form.Control.Feedback type="invalid">
                    {fieldErrors.target_completion_date}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Special Requirements</Form.Label>
                  <Form.Control as="textarea" rows={2} name="special_requirements" value={form.special_requirements} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Production Notes</Form.Label>
                  <Form.Control as="textarea" rows={2} name="production_notes" value={form.production_notes} onChange={handleChange} disabled={isLocked} />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {step === 4 && (
        <Card className="mb-4">
          <Card.Header className="bg-primary text-dark fw-semibold">Additional Information</Card.Header>
          <Card.Body>
            <Form.Group>
              <Form.Label>Payment Remarks</Form.Label>
              <Form.Control as="textarea" rows={2} name="payment_remarks" value={form.payment_remarks} onChange={handleChange} disabled={isLocked} />
            </Form.Group>
          </Card.Body>
        </Card>
      )}

      <div className="d-flex gap-2 justify-content-end flex-wrap">
        <Button variant="outline-secondary" onClick={() => navigate(-1)} disabled={saving}>Cancel</Button>
        {step > 1 && (
          <Button variant="outline-secondary" onClick={handlePreviousStep} disabled={saving}>Previous</Button>
        )}
        {step < totalSteps ? (
          <Button variant="primary" onClick={handleNextStep} disabled={saving}>
            Next
          </Button>
        ) : (
          <React.Fragment>
            {!orderId && (
              <Button variant="outline-primary" onClick={() => handleSubmit('Draft')} disabled={saving || isLocked}>
                Save as Draft
              </Button>
            )}
            <Button variant="primary" onClick={() => handleSubmit('submit')} disabled={saving || isLocked}>
              {saving ? 'Saving...' : orderId ? 'Update Order' : 'Submit Order'}
            </Button>
          </React.Fragment>
        )}
      </div>
    </Form>
  );
}
