import { useState, useEffect } from 'react';
import { Container, Table, Button, Badge, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { appealsAPI } from '../services/api';
import { FiCheck, FiX, FiMessageSquare } from 'react-icons/fi';
import UserTitleBadge from '../components/UserTitleBadge';

function AdminAppealsPage() {
    const [appeals, setAppeals] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAppeals();
    }, []);

    const loadAppeals = async () => {
        try {
            const res = await appealsAPI.getAll();
            setAppeals(res.data);
        } catch (err) {
            console.error("Помилка завантаження апеляцій", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status, username) => {
        const actionText = status === 1 ? "РОЗБЛОКУВАТИ" : "ВІДХИЛИТИ апеляцію";
        if (!window.confirm(`Ви впевнені, що хочете ${actionText} користувача ${username}?`)) return;

        try {
            await appealsAPI.process(id, { status, adminComment: "Розглянуто адміністратором" });
            setAppeals(prev =>
                prev.map(a =>
                    a.id === id
                        ? { ...a, status: status, adminComment: "Розглянуто адміністратором" }
                        : a
                )
            );
            alert("Рішення прийнято!");
            } catch {
                alert("Помилка обробки апеляції");
            }
    };

    if (loading) return <Container className="text-center mt-5"><Spinner animation="border" variant="primary" /></Container>;

    const getStatusBadge = (status) => {
        switch (status) {
            case 0: return <Badge bg="warning" text="dark">Очікує</Badge>;
            case 1: return <Badge bg="success">Схвалено</Badge>;
            case 2: return <Badge bg="danger">Відхилено</Badge>;
            default: return <Badge bg="secondary">Невідомо</Badge>;
        }
    };

    return (
        <Container className="mt-5">
            <h2 className="mb-4 text-main d-flex align-items-center gap-2">
                <FiMessageSquare /> Історія апеляцій
            </h2>

            <div className="table-responsive">
                <Table hover variant="dark" className="bg-card shadow-sm rounded-4 overflow-hidden">
                    <thead>
                        <tr>
                            <th>Користувач</th>
                            <th>Дата</th>
                            <th>Статус</th>
                            <th>Текст апеляції</th>
                            <th className="text-center">Дії</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appeals.map(appeal => (
                            <tr key={appeal.id} style={{ opacity: appeal.status !== 0 ? 0.7 : 1 }}>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <Link to={`/users/${appeal.user?.id}`} className="fw-bold text-info text-decoration-none">@{appeal.user?.username}</Link>
                                        <UserTitleBadge
                                            role={appeal.user?.role}
                                            selectedAward={appeal.user?.selectedAward}
                                        />
                                    </div>
                                </td>
                                <td>{new Date(appeal.createdAt).toLocaleDateString()}</td>
                                <td>{getStatusBadge(appeal.status)}</td>
                                <td style={{ maxWidth: '300px' }}>{appeal.content}</td>
                                <td>
                                    <div className="d-flex gap-2 justify-content-center">
                                        {appeal.status === 0 ? (
                                            <>
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => handleAction(appeal.id, 1, appeal.user?.username)}
                                                >
                                                    <FiCheck /> Схвалити
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    onClick={() => handleAction(appeal.id, 2, appeal.user?.username)}
                                                >
                                                    <FiX /> Відхилити
                                                </Button>
                                            </>
                                        ) : (
                                            <small className="text-muted italic">Опрацьовано</small>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Container>
    );
}

export default AdminAppealsPage;