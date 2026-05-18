import { useState } from 'react';
import { Card, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { applicationsAPI } from '../services/api';

const BecomeCriticBanner = () => {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [motivation, setMotivation] = useState('');
    const [loading, setLoading] = useState(false);

    if (!user || user.role === 'Reviewer' || user.role === 'Admin') return null;

    const isBlocked = user.isBlocked === true || user.isBlocked === 'True';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await applicationsAPI.submit({ motivationText: motivation });
            setShowModal(false);
            setMotivation('');
            alert("Вашу заявку успішно відправлено! Очікуйте рішення адміністратора.");
        } catch (error) {
            alert(error.response?.data || "Помилка при відправці заявки");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Card className="border-0 shadow-sm mb-4 text-center" style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--bg-input))' }}>
                <Card.Body className="p-4">
                    <h4 className="fw-bold mb-2" style={{ color: 'var(--primary-color)' }}>🎬 Бажаєте стати офіційним кінокритиком Kovix?</h4>
                    <p className="text-muted mb-3">Отримайте спеціальний бейдж, пишіть розгорнуті рецензії та впливайте на рейтинг фільмів!</p>
                    <div>
                        <Button variant="warning" className="fw-bold px-4" onClick={() => setShowModal(true)} disabled={isBlocked}>
                            Подати заявку
                        </Button>
                        {isBlocked && <div className="small text-danger mt-2">Ви заблоковані - не можете подавати заявки на статус критика.</div>}
                    </div>
                </Card.Body>
            </Card>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="bg-card text-main border-secondary">
                <Modal.Header closeButton style={{ borderColor: 'var(--border-color)' }}>
                    <Modal.Title className="fw-bold text-primary">📝 Заявка на статус Критика</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Чому ми маємо обрати саме вас?</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={4} 
                                required 
                                minLength={20}
                                placeholder="Розкажіть про свій досвід, любов до кіно або дайте посилання на ваш блог..."
                                className="bg-input text-main border-secondary"
                                value={motivation}
                                onChange={(e) => setMotivation(e.target.value)}
                            />
                            <Form.Text className="text-muted">Мінімум 20 символів.</Form.Text>
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2 mt-4">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Скасувати</Button>
                            <Button variant="warning" type="submit" disabled={loading} className="fw-bold">
                                {loading ? <Spinner size="sm"/> : 'Відправити'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default BecomeCriticBanner;