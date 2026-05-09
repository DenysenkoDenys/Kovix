import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionAPI } from '../services/api';

function MembershipPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const isPremium = user?.isPremium || false;

    const handleSelectPlan = async (planId) => {
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            const response = await subscriptionAPI.createCheckout({ planId });
            if (response.data && response.data.url) {
                window.location.href = response.data.url;
            }
        } catch (error) {
            console.error('Помилка генерації платежу:', error);
            alert('Помилка підключення до платіжної системи');
        }
    };

    return (
        <Container className="mt-5 mb-5">
            <div className="text-center mb-5">
                <h1 className="fw-bold" style={{ color: 'var(--text-main)' }}>Kovix <span className="text-warning">Premium</span></h1>
                <p className="text-muted fs-5">Підтримайте розвиток платформи та отримайте ексклюзивні можливості</p>
            </div>

            <Row className="justify-content-center mt-5">
                
                <Col md={5} lg={4} className="mb-4">
                    <Card className="h-100 shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <Card.Body className="p-4 d-flex flex-column">
                            <h4 className="text-center mb-3" style={{ color: 'var(--text-main)' }}>Базовий</h4>
                            <h2 className="text-center mb-4" style={{ color: 'var(--text-main)' }}>Безкоштовно</h2>
                            <ul className="list-unstyled flex-grow-1" style={{ color: 'var(--text-main)' }}>
                                <li className="mb-3">✅ Доступ до бази фільмів</li>
                                <li className="mb-3">✅ Створення звичайних тір-лістів</li>
                                <li className="mb-3">✅ Спілкування на форумі</li>
                            </ul>
                            <Button variant="outline-secondary" disabled={!isPremium} className="w-100 mt-auto">
                                {isPremium ? "Безкоштовний доступ" : "Ваш поточний план"}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={5} lg={4} className="mb-4">
                    <Card 
                        className="h-100 shadow border-warning position-relative" 
                        style={{ backgroundColor: 'var(--bg-card)', borderWidth: '2px', overflow: 'visible' }}
                    >
                        <Badge 
                            bg="warning" 
                            text="dark" 
                            className="position-absolute top-0 start-50 translate-middle px-3 py-2 fs-6 rounded-pill"
                            style={{ zIndex: 10, whiteSpace: 'nowrap' }}
                        >
                            Найпопулярніший
                        </Badge>
                        
                        <Card.Body className="p-4 d-flex flex-column mt-2">
                            <h4 className="text-center mb-3 text-warning">Premium ЩОМІСЯЦЯ</h4>
                            <h2 className="text-center mb-4" style={{ color: 'var(--text-main)' }}>$2.99<span className="fs-6 text-muted">/міс</span></h2>
                            <ul className="list-unstyled flex-grow-1" style={{ color: 'var(--text-main)' }}>
                                <li className="mb-3">👑 <strong>Відсутність реклами</strong></li>
                                <li className="mb-3">👑 Ексклюзивний <strong>VIP значок</strong></li>
                                <li className="mb-3">👑 Доступ до закритих розділів</li>
                            </ul>

                            <Button 
                                variant={isPremium ? "outline-warning" : "warning"} 
                                className="w-100 mt-auto fw-bold" 
                                onClick={() => handleSelectPlan('monthly')}
                                disabled={isPremium}
                            >
                                {isPremium ? "Ваш поточний план" : "Оформити підписку"}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={5} lg={4} className="mb-4">
                    <Card className="h-100 shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <Card.Body className="p-4 d-flex flex-column">
                            <h4 className="text-center mb-3 text-info">Premium НА РІК</h4>
                            <h2 className="text-center mb-4" style={{ color: 'var(--text-main)' }}>$29.99<span className="fs-6 text-muted">/рік</span></h2>
                            <Alert variant="info" className="text-center py-2 mb-4 small">Економія 16%</Alert>
                            <ul className="list-unstyled flex-grow-1" style={{ color: 'var(--text-main)' }}>
                                <li className="mb-3">🌟 Спеціальна роль у Discord</li>
                                <li className="mb-3">🌟 Ранній доступ до функцій</li>
                            </ul>
                            <Button 
                                variant={isPremium ? "outline-info" : "info"} 
                                className="w-100 mt-auto text-white fw-bold" 
                                onClick={() => handleSelectPlan('yearly')}
                                disabled={isPremium}
                            >
                                {isPremium ? "Ваш поточний план" : "Оформити на рік"}
                            </Button>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default MembershipPage;