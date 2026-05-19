import React, { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SocialLogin from '../components/SocialLogin';
import PageTransition from '../components/PageTransition';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const successMessage = location.state?.message || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await authAPI.login({ email, password });
      const { token, role, username } = response.data;
      
      login(token, username, role);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 403 && err.response.data.message === "EMAIL_NOT_VERIFIED") {
        localStorage.setItem('token', err.response.data.token);
        navigate('/verify-email');
        return;
      }

      setError(err.response?.data?.message || err.response?.data || 'Помилка входу');
    }
  };

  return (
    <PageTransition direction="left">
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <Card style={{ width: '400px' }} className="shadow">
          <Card.Body>
            <h2 className="text-center mb-4">Вхід</h2>
            {successMessage && <Alert variant="success">{successMessage}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  name="email"
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  autoComplete="username"
                  required 
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Пароль</Form.Label>
                <Form.Control 
                  name="password"
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  autoComplete="current-password"
                  required 
                />
              </Form.Group>
              <Button className="w-100" type="submit">Увійти</Button>
              <div className="text-center mt-3">
                  <Link to="/forgot-password" style={{ color: 'var(--primary-color)' }}>
                      Забули пароль?
                  </Link>
              </div>
            </Form>

            <div className="d-flex align-items-center my-3">
               <hr className="flex-grow-1" />
               <span className="mx-2 text-muted small">АБО</span>
               <hr className="flex-grow-1" />
            </div>

            <SocialLogin /> 
            <div className="text-center mt-3">
              Ще немає акаунту? <Link to="/register">Зареєструватися</Link>
            </div>
          </Card.Body>
        </Card>
      </Container>
    </PageTransition>
  );
}

export default LoginPage;