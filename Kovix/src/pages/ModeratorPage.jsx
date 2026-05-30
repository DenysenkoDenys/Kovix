import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert, Modal, Form, Tabs, Tab } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { moderatorAPI } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { API_BASE_URL } from '../utils/apiConfig';
import defaultAvatarImg from '../assets/NotFoundAvatar.png';

const ModeratorPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { themeMode } = useTheme();
    const isDark = themeMode === 'dark';

    const [reports, setReports] = useState([]);
    const [reportFilter, setReportFilter] = useState(0); 
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [reportComment, setReportComment] = useState('');

    const [users, setUsers] = useState([]);
    const [blockedUsersOnly, setBlockedUsersOnly] = useState(false);

    const [actionInProgress, setActionInProgress] = useState(false);

    const formatDate = (dateString) => {
        if (!dateString) return 'Немає дати';
        try {
            let cleanDate = dateString.split('.')[0];
            let date = new Date(cleanDate);
            
            if (isNaN(date.getTime())) {
                date = new Date(cleanDate + 'Z');
            }
            
            if (isNaN(date.getTime())) {
                date = new Date(cleanDate.replace(/\//g, '-'));
            }
            
            if (isNaN(date.getTime())) {
                return dateString;
            }
            return date.toLocaleString('uk-UA');
        } catch (e) {
            console.error('Date parsing error:', dateString, e);
            return dateString || 'Некоректна дата';
        }
    };

    if (user?.role !== 'Admin' && user?.role !== 'Moderator') {
        return (
            <Container className="mt-5 text-center">
                <Alert variant="danger">
                    <h4>⛔ Доступ заборонено</h4>
                    <p>Ця сторінка доступна тільки адміністраторам та модераторам.</p>
                </Alert>
            </Container>
        );
    }

    useEffect(() => {
        const initializeData = async () => {
            try {
                await Promise.all([
                    loadReports(),
                    loadUsers()
                ]);
            } finally {
                setLoading(false);
            }
        };
        initializeData();
    }, []);

    const loadReports = async (filterValue = reportFilter) => {
        try {
            const res = await moderatorAPI.getReports(filterValue);
            setReports(res.data);
        } catch (err) {
            setError('Помилка завантаження звітів');
            console.error(err);
        }
    };

    const loadUsers = async (blockedValue = blockedUsersOnly) => {
        try {
            const res = await moderatorAPI.getUsersForModeration(blockedValue);
            setUsers(res.data);
        } catch (err) {
            setError('Помилка завантаження користувачів');
            console.error(err);
        }
    };

    const loadData = async (filterValue = reportFilter, blockedValue = blockedUsersOnly) => {
        setLoading(true);
        try {
            const [reportsRes, usersRes] = await Promise.all([
                moderatorAPI.getReports(filterValue),
                moderatorAPI.getUsersForModeration(blockedValue)
            ]);
            setReports(reportsRes.data);
            setUsers(usersRes.data);
        } catch (err) {
            setError('Помилка завантаження даних модерації');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteReview = async (reviewId, type = 'critic') => {
        if (!window.confirm('Видалити цю рецензію?')) return;
        
        try {
            setActionInProgress(true);
            if (type === 'critic') {
                await moderatorAPI.deleteCriticReview(reviewId);
            } else {
                await moderatorAPI.deleteUserReview(reviewId);
            }
            alert('Рецензія видалена');
            loadReports();
        } catch (err) {
            alert('Помилка видалення рецензії');
            console.error(err);
        } finally {
            setActionInProgress(false);
        }
    };

    const handleBlockUser = async (userId, username) => {
        const reason = prompt(`Введіть причину блокування для ${username}:`);
        if (!reason) return;

        try {
            setActionInProgress(true);
            await moderatorAPI.blockUser(userId, reason);
            alert(`Користувач ${username} заблокований`);
            loadUsers();
        } catch (err) {
            alert('Помилка блокування користувача');
            console.error(err);
        } finally {
            setActionInProgress(false);
        }
    };

    const handleUnblockUser = async (userId, username) => {
        if (!window.confirm(`Розблокувати ${username}?`)) return;

        try {
            setActionInProgress(true);
            await moderatorAPI.unblockUser(userId);
            alert(`Користувач ${username} розблокований`);
            loadUsers();
        } catch (err) {
            alert('Помилка розблокування');
            console.error(err);
        } finally {
            setActionInProgress(false);
        }
    };

    const handleResolveReport = async () => {
        if (!selectedReport || !reportComment.trim()) {
            alert('Введіть коментар');
            return;
        }

        try {
            setActionInProgress(true);
            await moderatorAPI.resolveReport(selectedReport.id, 1, reportComment);
            alert('Звіт розглянут');
            setShowReportModal(false);
            setReportComment('');
            loadReports();
        } catch (err) {
            alert('Помилка обробки звіту');
            console.error(err);
        } finally {
            setActionInProgress(false);
        }
    };

    if (loading) {
        return (
            <Container className="text-center mt-5">
                <Spinner animation="border" variant="warning" />
            </Container>
        );
    }

    return (
        <Container className="mt-4 mb-5">
            <h2 className="mb-4">🔒 Центр модерації</h2>

            {error && <Alert variant="danger">{error}</Alert>}

            <Tabs defaultActiveKey="reports" className="mb-4">
                <Tab eventKey="reports" title={`📋 Звіти (${reports.length})`}>
                    <div className="mt-3">
                        <div className="mb-3">
                            <Form.Check
                                type="radio"
                                label="Тільки необроблені"
                                name="reportFilter"
                                value={0}
                                checked={reportFilter === 0}
                                onChange={(e) => {
                                    setReportFilter(0);
                                    loadReports(0);
                                }}
                            />
                            <Form.Check
                                type="radio"
                                label="Всі звіти"
                                name="reportFilter"
                                value=""
                                checked={reportFilter === null}
                                onChange={(e) => {
                                    setReportFilter(null);
                                    loadReports(null);
                                }}
                            />
                        </div>

                        {reports.length === 0 ? (
                            <Alert variant="info">Немає звітів</Alert>
                        ) : (
                            <Row>
                                {reports.map(report => (
                                    <Col md={6} key={report.id} className="mb-3">
                                        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <strong>Від:</strong> {report.senderName}
                                                        <br />
                                                        <strong>На:</strong> {report.reportedUserName}
                                                    </div>
                                                    <Badge bg={report.isResolved ? 'success' : 'warning'}>
                                                        {report.isResolved ? 'Розглянуто' : 'Чекає'}
                                                    </Badge>
                                                </div>

                                                <div className="mb-2">
                                                    <strong>Причина:</strong>
                                                    <p className="text-muted small">{report.reason}</p>
                                                </div>

                                                {report.messageSnapshot && (
                                                    <div className="p-2 rounded bg-secondary bg-opacity-10 mb-2 small">
                                                        <strong>Повідомлення:</strong>
                                                        <p className="mb-0">"{report.MessageSnapshot}"</p>
                                                    </div>
                                                )}

                                                {report.adminComment && (
                                                    <div className="mb-2">
                                                        <strong>Коментар адміна:</strong>
                                                        <p className="text-muted small">{report.adminComment}</p>
                                                    </div>
                                                )}

                                                <small className="text-muted">
                                                    {formatDate(report.createdAt)}
                                                </small>

                                                {!report.isResolved && (
                                                    <div className="mt-3">
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedReport(report);
                                                                setShowReportModal(true);
                                                            }}
                                                            disabled={actionInProgress}
                                                        >
                                                            Розглянути
                                                        </Button>
                                                    </div>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </div>
                </Tab>

                <Tab eventKey="users" title={`👥 Користувачі (${users.length})`}>
                    <div className="mt-3">
                        <Form.Check
                            type="checkbox"
                            label="Тільки заблоковані"
                            checked={blockedUsersOnly}
                            onChange={(e) => {
                                setBlockedUsersOnly(e.target.checked);
                                loadUsers(e.target.checked);
                            }}
                        />

                        {users.length === 0 ? (
                            <Alert variant="info">Немає користувачів</Alert>
                        ) : (
                            <div className="mt-3">
                                {users.map(u => (
                                    <Card key={u.id} className="mb-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                                        <Card.Body>
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="d-flex gap-3" style={{ flex: 1 }}>
                                                    <img
                                                        src={u.avatarUrl ? `${API_BASE_URL}${u.avatarUrl}` : defaultAvatarImg}
                                                        alt={u.username}
                                                        className="rounded-circle"
                                                        style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                                    />
                                                    <div>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <strong>{u.username}</strong>
                                                            <Badge bg={u.role === 'Admin' ? 'danger' : u.role === 'Moderator' ? 'warning' : 'secondary'}>
                                                                {u.role}
                                                            </Badge>
                                                            {u.isBlocked && <Badge bg="danger">🚫 Заблокований</Badge>}
                                                        </div>
                                                        <small className="text-muted">{u.email}</small>
                                                        <div className="mt-1 small">
                                                            📝 Рецензій: {u.reviewsCount}, ✍️ Критичних: {u.criticReviewsCount}
                                                        </div>
                                                    </div>
                                                </div>

                                                {u.role !== 'Admin' && (
                                                    <div className="d-flex gap-2">
                                                        {!u.isBlocked ? (
                                                            <Button
                                                                variant="outline-danger"
                                                                size="sm"
                                                                onClick={() => handleBlockUser(u.id, u.username)}
                                                                disabled={actionInProgress}
                                                            >
                                                                🚫 Блокувати
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="outline-success"
                                                                size="sm"
                                                                onClick={() => handleUnblockUser(u.id, u.username)}
                                                                disabled={actionInProgress}
                                                            >
                                                                ✅ Розблокувати
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </Tab>
            </Tabs>

            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Розглянути звіт</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedReport && (
                        <div>
                            <p>
                                <strong>Від:</strong> {selectedReport.senderName}
                            </p>
                            <p>
                                <strong>На:</strong> {selectedReport.reportedUserName}
                            </p>
                            <p>
                                <strong>Причина:</strong> {selectedReport.reason}
                            </p>
                            {selectedReport.messageSnapshot && (
                                <p>
                                    <strong>Повідомлення:</strong>
                                    <div className="p-2 rounded bg-secondary bg-opacity-10">
                                        "{selectedReport.messageSnapshot}"
                                    </div>
                                </p>
                            )}

                            <Form.Group>
                                <Form.Label>Коментар адміна</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    value={reportComment}
                                    onChange={(e) => setReportComment(e.target.value)}
                                    placeholder="Введіть коментар про це рішення..."
                                />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReportModal(false)}>
                        Скасувати
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleResolveReport}
                        disabled={actionInProgress || !reportComment.trim()}
                    >
                        {actionInProgress ? <Spinner size="sm" /> : '✓'} Розглянути
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ModeratorPage;
