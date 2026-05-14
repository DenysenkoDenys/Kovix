import { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { supportAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function SupportWidget() {
    const { user } = useAuth();
    
    const [showModal, setShowModal] = useState(false);
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    if (!user) return null; 

    const handleClose = () => {
        setShowModal(false);
        setSubject('');
        setMessage('');
        setStatus({ type: '', text: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            setStatus({ type: 'danger', text: 'Будь ласка, заповніть всі поля.' });
            return;
        }

        setLoading(true);
        setStatus({ type: '', text: '' });

        try {
            await supportAPI.createTicket({ subject, message });
            setStatus({ type: 'success', text: 'Запит успішно надіслано!' });
            setSubject('');
            setMessage('');
            
            setTimeout(() => {
                handleClose();
            }, 1500);

        } catch (err) {
            console.error('Помилка відправки тікета:', err);
            setStatus({ type: 'danger', text: 'Сталася помилка при відправці. Спробуйте пізніше.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                className="rounded-circle shadow-lg d-flex justify-content-center align-items-center support-fab"
                onClick={() => setShowModal(true)}
                title="Написати модератору"
                style={{
                    position: 'fixed',
                    bottom: '40px',
                    right: '40px',
                    width: '65px',
                    height: '65px',
                    backgroundColor: 'var(--primary-color)',
                    borderColor: 'var(--primary-color)',
                    zIndex: 9999,
                    fontSize: '28px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
            >
                💬
            </Button>

            <Modal show={showModal} onHide={handleClose} centered backdrop="static" style={{ zIndex: 10000 }}>
                <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                    <Modal.Title className="fw-bold">🛠️ Зв'язок з модератором</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    {status.text && <Alert variant={status.type} className="mb-4 rounded-3">{status.text}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label style={{ color: 'var(--text-secondary)' }}>Тема звернення</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="Наприклад: Проблема з відгуком"
                                value={subject} 
                                onChange={(e) => setSubject(e.target.value)} 
                                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} 
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label style={{ color: 'var(--text-secondary)' }}>Опишіть вашу проблему</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={5} 
                                placeholder="Надайте якомога більше деталей..."
                                value={message} 
                                onChange={(e) => setMessage(e.target.value)} 
                                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} 
                            />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={handleClose} disabled={loading}>
                                Скасувати
                            </Button>
                            <Button variant="primary" type="submit" disabled={loading} style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
                                {loading ? 'Відправка...' : 'Надіслати запит'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            <style>{`
                .support-fab:hover {
                    transform: scale(1.1);
                    box-shadow: 0 10px 20px rgba(33, 150, 243, 0.4) !important;
                }
            `}</style>
        </>
    );
}