import React, { useEffect, useRef } from 'react';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { ROLE_LABELS } from '../../lib/constants';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const collapseRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navbarRef = useRef<HTMLElement>(null);

  // Close mobile navbar after clicking outside the entire navbar component
  useEffect(() => {
    const navbarEl = navbarRef.current;
    if (!navbarEl) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!navbarEl.contains(event.target as Node)) {
        // Trigger click on toggle button to close navbar
        toggleRef.current?.click();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function closeMobileNavbar() {
    // Trigger click on toggle button to close navbar
    toggleRef.current?.click();
  }

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: '⊞', match: (p: string) => p === '/' },
    { to: '/orders', label: 'Orders', icon: '📋', match: (p: string) => p.startsWith('/orders') },
    { to: '/workflow', label: 'Workflow', icon: '⇢', match: (p: string) => p === '/workflow' },
  ];

  return (
    <>
      <Navbar ref={navbarRef} className="oms-navbar" expand="lg" sticky="top">
        <Container fluid="xl">
          <Navbar.Brand as={Link} to="/">
            <div className="brand-icon">🏭</div>
            <span>Yip Brother <span style={{ fontWeight: 400, opacity: 0.6 }}>OMS</span></span>
          </Navbar.Brand>

          <Navbar.Toggle ref={toggleRef} aria-controls="main-nav" className="border-0 shadow-none" />

          <Navbar.Collapse id="main-nav" ref={collapseRef}>
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
                  <NavDropdown.Item onClick={() => { handleSignOut(); closeMobileNavbar(); }} className="text-danger">
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
