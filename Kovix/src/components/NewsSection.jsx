import { useState, useEffect } from 'react';
import { Container, Card, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { newsAPI } from '../services/api';
import { FaPlus, FaTrash, FaEdit, FaTools, FaInfoCircle, FaBullhorn } from 'react-icons/fa';

const NewsSection = () => {
    const { isAdmin } = useAuth();
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const emptyForm = { title: '', content: '', category: 'Info', isPinned: false };
    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => { loadNews(); }, []);

    const loadNews = async () => {
        try {
            const res = await newsAPI.getAll();
            setNews(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Видалити цю новину?")) return;
        try {
            await newsAPI.delete(id);
            loadNews();
            window.dispatchEvent(new Event('newsChanged'));
        } catch { alert("Помилка при видаленні"); }
    };

    const handleShowCreate = () => {
        setEditingId(null);
        setFormData(emptyForm);
        setShowModal(true);
    };

    const handleShowEdit = (item) => {
        setEditingId(item.id);
        setFormData({
            title: item.title,
            content: item.content,
            category: item.category,
            isPinned: item.isPinned
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingId) {
                await newsAPI.update(editingId, formData);
            } else {
                await newsAPI.create(formData);
            }
            setShowModal(false);
            loadNews();
            window.dispatchEvent(new Event('newsChanged'));
        } catch {
            alert("Помилка при збереженні новини");
        } finally {
            setIsSaving(false);
        }
    };

    const getCategoryBadge = (cat) => {
        switch (cat) {
            case 'Tech': return <Badge bg="danger"><FaTools className="me-1" /> Техроботи</Badge>;
            case 'Update': return <Badge bg="warning" text="dark"><FaPlus className="me-1" /> Оновлення</Badge>;
            case 'Important': return <Badge bg="info"><FaBullhorn className="me-1" /> Важливо</Badge>;
            default: return <Badge bg="secondary"><FaInfoCircle className="me-1" /> Інфо</Badge>;
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="warning" /></div>;

    return (
        <Container className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold mb-0" style={{ color: 'var(--text-main)' }}>📢 Оголошення</h2>
                {isAdmin && isAdmin() && (
                    <Button variant="success" size="sm" onClick={handleShowCreate} className="fw-bold">
                        <FaPlus className="me-1" /> Створити новину
                    </Button>
                )}
            </div>

            <div className="d-flex flex-column gap-3">
                {news.length === 0 ? (
                    <div className="text-center p-5 rounded" style={{ border: '1px dashed var(--border-color)' }}>
                        <p className="text-muted fst-italic mb-0">Новин поки немає...</p>
                    </div>
                ) : (
                    news.map(item => (
                        <Card key={item.id} className="border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderLeft: item.category === 'Tech' ? '4px solid #ff4d4d' : '4px solid var(--primary-color)' }}>
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <div className="mb-2">
                                            {item.isPinned && <Badge bg="primary" className="me-2">📌 Закріплено</Badge>}
                                            {getCategoryBadge(item.category)}
                                            <small className="text-muted ms-3 fw-semibold">
                                                {new Date(item.createdAt).toLocaleDateString('uk-UA')}
                                            </small>
                                        </div>
                                        <h4 className="fw-bold" style={{ color: 'var(--primary-color)' }}>{item.title}</h4>
                                        <p className="mb-0 text-main" style={{ whiteSpace: 'pre-wrap', opacity: 0.9 }}>{item.content}</p>
                                    </div>

                                    {isAdmin && isAdmin() && (
                                        <div className="d-flex gap-2 ms-3">
                                            <Button variant="outline-warning" size="sm" onClick={() => handleShowEdit(item)} title="Редагувати">
                                                <FaEdit />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)} title="Видалити">
                                                <FaTrash />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    ))
                )}
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="bg-card text-main border-secondary" size="lg">
                <Modal.Header closeButton style={{ borderColor: 'var(--border-color)' }}>
                    <Modal.Title className="fw-bold">{editingId ? '✏️ Редагувати новину' : '📝 Створити новину'}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-main">
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Заголовок</Form.Label>
                            <Form.Control
                                required
                                className="bg-input text-main border-secondary"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Категорія</Form.Label>
                            <Form.Select
                                className="bg-input text-main border-secondary"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Info">Інформація</option>
                                <option value="Tech">Техроботи</option>
                                <option value="Update">Оновлення</option>
                                <option value="Important">Важливо</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Зміст новини</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={6}
                                required
                                className="bg-input text-main border-secondary"
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            />
                        </Form.Group>

                        <div className="p-3 rounded mb-4" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                            <Form.Check
                                type="checkbox"
                                id="pin-checkbox"
                                label={<span className="fw-bold ms-1 text-primary">📌 Закріпити новину на головній</span>}
                                checked={formData.isPinned}
                                onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                            />
                            <Form.Text className="text-muted ms-4">
                                Закріплена новина автоматично показуватиметься у вигляді банера зверху на всіх сторінках сайту.
                            </Form.Text>
                        </div>

                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Скасувати</Button>
                            <Button variant="primary" type="submit" disabled={isSaving} style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
                                {isSaving ? <Spinner size="sm" /> : (editingId ? 'Зберегти зміни' : 'Опублікувати')}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default NewsSection;