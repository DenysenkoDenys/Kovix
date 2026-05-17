import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Button, Badge, Modal, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { newsPostsAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';
import { useAuth } from '../contexts/AuthContext';
import defaultPosterImg from '../assets/NotFoundPoster.webp';

export default function ComingSoonBlog() {
    const [newsposts, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const isAdminOrMod = user?.role === 'Admin' || user?.role === 'Moderator';

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ title: '', shortDescription: '', content: '', imageUrl: '', isPublished: true });
    const [isDragging, setIsDragging] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const fetchNews = async () => {
        setLoading(true);
        try {
            const res = await newsPostsAPI.getLatest(3);
            setNews(res.data);
        } catch (error) {
            console.error("Помилка завантаження новин:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Ви впевнені, що хочете видалити цю новину?')) return;
        try {
            await newsPostsAPI.delete(id);
            fetchNews();
        } catch (error) {
            console.error("Помилка видалення:", error);
            alert("Не вдалося видалити новину.");
        }
    };

    const handleEditClick = (item) => {
        setEditingId(item.id);
        setFormData({ ...item });
        setShowModal(true);
    };

    const handleAddClick = () => {
        setEditingId(null);
        setFormData({ title: '', shortDescription: '', content: '', imageUrl: '', isPublished: true });
        setShowModal(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await uploadFile(files[0]);
        }
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            await uploadFile(files[0]);
        }
    };

    const uploadFile = async (file) => {
        if (!file.type.startsWith('image/')) {
            alert('Будь ласка, виберіть зображення!');
            return;
        }

        setUploadingImage(true);
        try {
            const res = await newsPostsAPI.upload(file);
            setFormData({ ...formData, imageUrl: res.data.url || res.data.filePath });
            setUploadingImage(false);
        } catch (error) {
            console.error('Помилка завантаження:', error);
            alert('Не вдалося завантажити зображення');
            setUploadingImage(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await newsPostsAPI.update(editingId, formData);
            } else {
                await newsPostsAPI.create(formData);
            }
            setShowModal(false);
            fetchNews();
        } catch (error) {
            console.error("Помилка збереження:", error);
            alert("Помилка збереження!");
        }
    };

    if (loading) {
        return <div className="text-center my-4"><Spinner animation="border" variant="primary" /></div>;
    }

    if (newsposts.length === 0 && !isAdminOrMod) {
        return null;
    }

    const truncateText = (text, maxLength) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <section className="mb-5 mt-5">
            <div className="d-flex justify-content-between align-items-center mb-4 border-start border-4 border-info ps-2">
                <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-main)' }}>📰 Скоро на сайті & Новини</h3>

                {isAdminOrMod && (
                    <div>
                        <Button variant="success" size="sm" className="me-2 fw-bold" onClick={handleAddClick}>
                            + Додати новину
                        </Button>
                        <Button as={Link} to="/admin/news" variant="outline-warning" size="sm">
                            ⚙️ Всі новини
                        </Button>
                    </div>
                )}
            </div>

            {newsposts.length === 0 && isAdminOrMod && (
                <div className="text-center p-4 rounded border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                    Поки що немає новин. Натисніть "+ Додати новину", щоб створити першу!
                </div>
            )}

            <Row>
                {newsposts.map(item => {
                    const imageUrl = item.imageUrl
                        ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${getApiBaseUrl()}${item.imageUrl}`)
                        : defaultPosterImg;

                    return (
                        <Col key={item.id} xs={12} md={4} className="mb-4">
                            <Card className="h-100 shadow-sm border-0 position-relative news-card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>

                                {isAdminOrMod && (
                                    <div className="position-absolute bottom-0 end-0 m-2 d-flex gap-2" style={{ zIndex: 3 }}>
                                        <Button variant="primary" size="sm" className="rounded-circle shadow" onClick={() => handleEditClick(item)} title="Редагувати">
                                            ✏️
                                        </Button>
                                        <Button variant="danger" size="sm" className="rounded-circle shadow" onClick={() => handleDelete(item.id)} title="Видалити">
                                            🗑️
                                        </Button>
                                    </div>
                                )}

                                {item.isPinned && (
                                    <Badge bg="danger" className="position-absolute top-0 end-0 m-2 shadow" style={{ zIndex: 2 }}>📌 Важливо</Badge>
                                )}

                                <div style={{ height: '200px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                                    <img
                                        src={imageUrl}
                                        alt={item.title}
                                        className="w-100 h-100"
                                        style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
                                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                    />
                                </div>
                                <Card.Body className="d-flex flex-column" style={{ position: 'relative', zIndex: 2 }}>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <small className="text-muted">
                                            📅 {new Date(item.createdAt).toLocaleDateString('uk-UA')}
                                        </small>
                                    </div>

                                    <Card.Title className="fw-bold" style={{ color: 'var(--text-main)' }}>
                                        {item.title}
                                    </Card.Title>

                                    <Card.Text style={{ color: 'var(--text-secondary)', flexGrow: 1 }}>
                                        {truncateText(item.shortDescription || item.content, 120)}
                                    </Card.Text>

                                    <Button
                                        as={Link}
                                        to={`/newsposts/${item.id}`}
                                        variant="outline-primary"
                                        className="mt-auto align-self-start rounded-pill px-4"
                                        size="sm"
                                    >
                                        Читати далі
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    );
                })}
                <div className="text-center mt-4">
                    <Button as={Link} to="/newsposts" variant="outline-info" className="px-5 rounded-pill">
                        Дивитися всі новини
                    </Button>
                </div>
            </Row>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" data-bs-theme="dark" style={{ zIndex: 1060 }}>
                <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                    <Modal.Title>{editingId ? '✏️ Редагувати новину' : '✨ Додати новину'}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
                    <Form onSubmit={handleSave}>
                        <Form.Group className="mb-3">
                            <Form.Label>Заголовок</Form.Label>
                            <Form.Control required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Короткий опис (на Головну сторінку)</Form.Label>
                            <Form.Control required as="textarea" rows={2} value={formData.shortDescription} onChange={e => setFormData({ ...formData, shortDescription: e.target.value })} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Повний текст (на сторінку новини)</Form.Label>
                            <Form.Control required as="textarea" rows={6} value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Обкладинка новини</Form.Label>
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('imageUploadInput').click()}
                                className="d-flex flex-column align-items-center justify-content-center p-4 mb-2"
                                style={{
                                    border: `2px dashed ${isDragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                    borderRadius: '12px',
                                    backgroundColor: isDragging ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-card)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    minHeight: '150px'
                                }}
                            >
                                <input 
                                    type="file" 
                                    id="imageUploadInput" 
                                    hidden 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                />
                                
                                {uploadingImage ? (
                                    <Spinner animation="border" variant="primary" />
                                ) : formData.imageUrl ? (
                                    <>
                                        <img 
                                            src={formData.imageUrl.startsWith('http') || formData.imageUrl.startsWith('data:') ? formData.imageUrl : `${getApiBaseUrl()}${formData.imageUrl}`} 
                                            alt="Preview" 
                                            style={{ maxHeight: '120px', borderRadius: '8px', objectFit: 'cover' }} 
                                        />
                                        <p className="mt-2 mb-0 text-muted small">Клікніть або перетягніть інше фото для заміни</p>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '2rem', opacity: 0.5 }}>📥</div>
                                        <p className="mb-0 text-muted">Перетягніть сюди картинку або клікніть для вибору</p>
                                    </>
                                )}
                            </div>
                            
                            <Form.Control 
                                type="text" 
                                placeholder="...або вставте пряме посилання на картинку (URL)" 
                                value={formData.imageUrl || ''} 
                                onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }} 
                            />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Check type="checkbox" label="Опублікувати одразу" checked={formData.isPublished} onChange={e => setFormData({ ...formData, isPublished: e.target.checked })} />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Скасувати</Button>
                            <Button variant="primary" type="submit">💾 Зберегти</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>

            <style>{`
                .news-card:hover {
                    box-shadow: 0 10px 20px rgba(0,0,0,0.15) !important;
                    transform: translateY(-5px);
                    transition: all 0.3s ease;
                }
            `}</style>
        </section>
    );
}