import React from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ROLE_LABELS } from '../../lib/constants';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: '⊞', match: (p: string) => p === '/' },
    { to: '/orders', label: 'Orders', icon: '📋', match: (p: string) => p.startsWith('/orders') },
    { to: '/workflow', label: 'Workflow', icon: '⇢', match: (p: string) => p === '/workflow' },
  ];

  return (
    <>
      <Navbar className="oms-navbar" expand="lg" sticky="top">
        <Container fluid="xl">
          <Navbar.Brand as={Link} to="/">
            <div className="brand-icon">🏭</div>
            <span>Yip Brother <span style={{ fontWeight: 400, opacity: 0.6 }}>OMS</span></span>
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="main-nav" className="border-0 shadow-none" />

          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto ms-3 gap-1">
              {navLinks.map(({ to, label, match }) => (
                <Nav.Link
                  key={to}
                  as={Link}
                  to={to}
                  active={match(location.pathname)}
                >
                  {label}
                </Nav.Link>
              ))}
            </Nav>

            <Nav>
              {profile && (
                <NavDropdown
                  title={
                    <span className="user-pill">
                      <span style={{ fontSize: '1rem' }}>👤</span>
                      <span>{profile.full_name}</span>
                      <span className="role-chip">{ROLE_LABELS[profile.role]}</span>
                    </span>
                  }
                  align="end"
                  className="user-dropdown"
                >
                  <NavDropdown.Header style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Signed in as
                  </NavDropdown.Header>
                  <NavDropdown.Item disabled style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    {profile.full_name}
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleSignOut} className="text-danger">
                    Sign Out
                  </NavDropdown.Item>
                </NavDropdown>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="app-main">
        <Container fluid="xl">
          {children}
        </Container>
      </main>
    </>
  );
}
