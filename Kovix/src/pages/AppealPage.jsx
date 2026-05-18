import { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card, Spinner } from 'react-bootstrap';
import { appealsAPI } from '../services/api';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../utils/apiConfig';

function AppealPage() {
    const { refreshUser } = useAuth();

    const [text, setText] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const loadAppeal = async () => {
        try {
            const res = await appealsAPI.getMyAppeal();
            setStatus(res.data);
        } catch (e) {
            console.error("Помилка отримання апеляції", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAppeal();
    }, []);

    useEffect(() => {
        const connection = new HubConnectionBuilder()
            .withUrl(`${API_BASE_URL}/notificationHub`, {
                accessTokenFactory: () => localStorage.getItem('token')
            })
            .withAutomaticReconnect()
            .build();

        connection.start()
            .then(() => console.log("✅ SignalR connected"))
            .catch(err => console.error("❌ SignalR error:", err));

        const onAppealUpdated = async () => {
            await loadAppeal();
            await refreshUser();
        };

        const onUserUpdated = async () => {
            await refreshUser();
        };

        connection.on("AppealStatusUpdated", onAppealUpdated);
        connection.on("UserUpdated", onUserUpdated);

        return () => {
            connection.off("AppealStatusUpdated", onAppealUpdated);
            connection.off("UserUpdated", onUserUpdated);
            connection.stop();
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (text.length < 20) {
            alert("Мінімум 20 символів");
            return;
        }

        setSubmitting(true);

        try {
            await appealsAPI.create(text);
            await loadAppeal();
        } catch (err) {
            alert(err.response?.data || "Помилка");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <Spinner className="d-block mx-auto mt-5" />;
    }

    return (
        <Container className="mt-5" style={{ maxWidth: '600px' }}>
            <Card className="shadow-lg border-0 bg-card text-main p-4 rounded-4">
                <h2 className="text-center mb-4">⚖️ Апеляція</h2>

                {status?.status === 0 && (
                    <Alert variant="warning">
                        На розгляді з {new Date(status.createdAt).toLocaleDateString()}
                    </Alert>
                )}

                {status?.status === 1 && (
                    <Alert variant="success">
                        Апеляцію схвалено! Акаунт розблоковано.
                    </Alert>
                )}

                {status?.status === 2 && (
                    <>
                        <Alert variant="danger">
                            Апеляцію відхилено. {status.adminComment}
                        </Alert>

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <Form.Label>Спробуйте ще раз</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={5}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    required
                                />
                            </Form.Group>

                            <Button type="submit" className="w-100" disabled={submitting}>
                                {submitting ? "Відправка..." : "Подати ще раз"}
                            </Button>
                        </Form>
                    </>
                )}

                {!status && (
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Чому вас розблокувати?</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={5}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Button type="submit" className="w-100" disabled={submitting}>
                            {submitting ? "Відправка..." : "Подати"}
                        </Button>
                    </Form>
                )}
            </Card>
        </Container>
    );
}

export default AppealPage;