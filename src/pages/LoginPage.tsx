import React, { useState } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    else navigate('/');
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="text-center mb-4">
          <img src="logo.png" alt="Yip Brother Logo" className="brand-icon" />
          <h4 className="fw-bold mb-1">Yip Brother OMS</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Operation Management System
          </p>
        </div>

        {error && (
          <Alert variant="danger" className="alert-modern py-2 mb-3">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email Address</Form.Label>
            <Form.Control
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="form-control-modern"
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="form-control-modern"
            />
          </Form.Group>
          <Button
            variant="primary"
            type="submit"
            className="w-100 btn-modern"
            disabled={loading}
            style={{ padding: '0.625rem' }}
          >
            {loading ? (
              <><span className="spinner-border spinner-border-sm me-2" role="status" />Signing in...</>
            ) : (
              'Sign In'
            )}
          </Button>
        </Form>

        <p className="text-center mt-4 mb-0" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Contact your administrator to get access
        </p>
      </div>
    </div>
  );
}
