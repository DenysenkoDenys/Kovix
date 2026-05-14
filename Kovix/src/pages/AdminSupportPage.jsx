import { useState, useEffect } from 'react';
import { Container, Table, Button, Badge, Card, Spinner, Modal, Form } from 'react-bootstrap';
import { supportAPI } from '../services/api';

export default function AdminSupportPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    const [replyModalInfo, setReplyModalInfo] = useState({ show: false, ticketId: null, text: '' });

    const fetchTickets = async () => {
        try {
            const res = await supportAPI.getAllTickets();
            setTickets(res.data);
        } catch (err) {
            console.error("Помилка завантаження тікетів:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleToggleStatus = async (id) => {
        try {
            await supportAPI.toggleTicketStatus(id);
            fetchTickets();
        } catch (err) {
            console.error("Помилка оновлення статусу:", err);
        }
    };

    const submitReply = async () => {
        if (!replyModalInfo.text.trim()) return;
        try {
            await supportAPI.replyToTicket(replyModalInfo.ticketId, replyModalInfo.text);
            setReplyModalInfo({ show: false, ticketId: null, text: '' });
            fetchTickets();
        } catch (err) {
            console.error("Помилка відправки відповіді:", err);
        }
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container className="my-5">
            <h2 className="mb-4 fw-bold" style={{ color: 'var(--text-main)' }}>Панель Модератора: Звернення</h2>
            
            <Card className="shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                <Table responsive hover className="mb-0" style={{ color: 'var(--text-main)' }}>
                    <thead style={{ backgroundColor: 'var(--bg-main)' }}>
                        <tr>
                            <th style={{ color: 'var(--text-secondary)' }}>ID</th>
                            <th style={{ color: 'var(--text-secondary)' }}>Користувач</th>
                            <th style={{ color: 'var(--text-secondary)' }}>Тема / Повідомлення</th>
                            <th style={{ color: 'var(--text-secondary)' }}>Відповідь модератора</th>
                            <th style={{ color: 'var(--text-secondary)' }}>Статус</th>
                            <th style={{ color: 'var(--text-secondary)' }}>Дія</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tickets.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>Немає звернень.</td>
                            </tr>
                        ) : (
                            tickets.map(ticket => (
                                <tr key={ticket.id} style={{ backgroundColor: ticket.isResolved ? 'rgba(40, 167, 69, 0.05)' : 'transparent' }}>
                                    <td style={{ borderColor: 'var(--border-color)' }}>#{ticket.id}</td>
                                    <td className="fw-bold" style={{ borderColor: 'var(--border-color)', color: 'var(--primary-color)' }}>{ticket.username}</td>
                                    <td style={{ borderColor: 'var(--border-color)', maxWidth: '250px' }}>
                                        <div className="fw-bold">{ticket.subject}</div>
                                        <div className="small text-muted text-truncate">{ticket.message}</div>
                                    </td>
                                    <td style={{ borderColor: 'var(--border-color)', maxWidth: '250px' }}>
                                        {ticket.adminReply ? (
                                            <div className="small text-success">{ticket.adminReply}</div>
                                        ) : (
                                            <em className="small text-muted">Немає відповіді</em>
                                        )}
                                    </td>
                                    <td style={{ borderColor: 'var(--border-color)' }}>
                                        {ticket.isResolved ? <Badge bg="success">Вирішено</Badge> : <Badge bg="warning" text="dark">Очікує</Badge>}
                                    </td>
                                    <td style={{ borderColor: 'var(--border-color)' }}>
                                        <div className="d-flex gap-2">
                                            {!ticket.adminReply && !ticket.isResolved && (
                                                <Button size="sm" variant="primary" onClick={() => setReplyModalInfo({ show: true, ticketId: ticket.id, text: '' })}>Відповісти</Button>
                                            )}
                                            <Button size="sm" variant={ticket.isResolved ? "outline-secondary" : "outline-success"} onClick={() => handleToggleStatus(ticket.id)}>
                                                {ticket.isResolved ? 'Відкрити знову' : 'Закрити без відповіді'}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>
            </Card>

            <Modal show={replyModalInfo.show} onHide={() => setReplyModalInfo({ show: false, ticketId: null, text: '' })} centered>
                <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                    <Modal.Title>Відповідь користувачу</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    <Form.Control 
                        as="textarea" 
                        rows={4} 
                        placeholder="Напишіть відповідь тут..."
                        value={replyModalInfo.text}
                        onChange={(e) => setReplyModalInfo(prev => ({ ...prev, text: e.target.value }))}
                        style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                    />
                </Modal.Body>
                <Modal.Footer style={{ backgroundColor: 'var(--bg-card)', borderTopColor: 'var(--border-color)' }}>
                    <Button variant="secondary" onClick={() => setReplyModalInfo({ show: false, ticketId: null, text: '' })}>Скасувати</Button>
                    <Button variant="primary" onClick={submitReply}>Надіслати</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}