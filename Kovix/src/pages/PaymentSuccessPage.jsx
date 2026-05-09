import { useEffect, useState } from 'react';
import { Container, Card, Spinner, Button } from 'react-bootstrap';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { subscriptionAPI } from '../services/api';

function PaymentSuccessPage() {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); 

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            return;
        }

        const confirmPayment = async () => {
            try {
                await subscriptionAPI.confirmPayment({ sessionId });
                setStatus('success');
                
                setTimeout(() => {
                    window.location.href = '/'; 
                }, 3000);
            } catch (error) {
                console.error('Помилка підтвердження платежу:', error);
                setStatus('error');
            }
        };

        confirmPayment();
    }, [sessionId]);

    return (
        <Container className="mt-5 d-flex justify-content-center">
            <Card className="text-center p-5 shadow border-0" style={{ maxWidth: '500px', backgroundColor: 'var(--bg-card)' }}>
                {status === 'loading' && (
                    <>
                        <h3 className="mb-4" style={{ color: 'var(--text-main)' }}>Перевірка платежу...</h3>
                        <Spinner animation="border" variant="warning" style={{ width: '4rem', height: '4rem', margin: '0 auto' }} />
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="mb-4"><span style={{ fontSize: '80px' }}>🎉</span></div>
                        <h2 className="text-success fw-bold mb-3">Оплата успішна!</h2>
                        <p style={{ color: 'var(--text-main)' }}>Дякуємо за покупку. Тепер у вас статус <strong>Kovix Premium</strong>!</p>
                        <p className="text-muted small mt-3">Перенаправлення на головну сторінку...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="mb-4"><span style={{ fontSize: '80px' }}>❌</span></div>
                        <h3 className="text-danger fw-bold mb-3">Помилка перевірки</h3>
                        <p style={{ color: 'var(--text-main)' }}>Платіж не знайдено або він ще обробляється.</p>
                        <Button variant="outline-secondary" className="mt-3" onClick={() => navigate('/membership')}>
                            Повернутися до тарифів
                        </Button>
                    </>
                )}
            </Card>
        </Container>
    );
}

export default PaymentSuccessPage;