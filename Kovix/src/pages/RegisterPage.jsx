import { useState } from 'react';
import { Container, Form, Button, Card, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import SocialLogin from '../components/SocialLogin';
import ReCAPTCHA from "react-google-recaptcha";
import '../style/App.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Паролі не співпадають');
    }

    if (!captchaToken) {
      setError('Будь ласка, підтвердіть, що ви не робот 🤖');
      return;
    }

    try {
      const dataToSend = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        captchaToken: captchaToken,
      };

      await authAPI.register(dataToSend);

      navigate('/login', { 
        state: { message: 'Реєстрація успішна! Увійдіть у свій акаунт, щоб підтвердити пошту.' } 
      });
      
    } catch (err) {
      setError(err.response?.data || 'Помилка реєстрації');
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Card style={{ width: '400px' }} className="shadow">
        <Card.Body>
          <h2 className="text-center mb-4">Реєстрація</h2>
          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Ім'я користувача</Form.Label>
              <Form.Control
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Пароль</Form.Label>
              <Form.Control
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Підтвердження паролю</Form.Label>
              <Form.Control
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-4 d-flex justify-content-center recaptcha-wrapper">
              <ReCAPTCHA
                sitekey="6LcFI3UsAAAAAGkQhHzy-pri_rHxlygZs2wt2hMO"
                theme="dark"
                onChange={(token) => {
                  setCaptchaToken(token);
                  setError('');
                }}
              />
            </Form.Group>

            <Button className="w-100" type="submit">Зареєструватися</Button>
          </Form>

          <div className="d-flex align-items-center my-3">
            <hr className="flex-grow-1" />
            <span className="mx-2 text-muted small">АБО</span>
            <hr className="flex-grow-1" />
          </div>

          <div className="text-center mb-2 text-muted small">
            Увійти через соціальні мережі
          </div>

          <SocialLogin />

          <div className="text-center mt-3">
            Вже є акаунт? <Link to="/login">Увійти</Link>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default RegisterPage;