import { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Spinner, InputGroup, Pagination } from 'react-bootstrap';
import { newsPostsAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';
import { getUploadErrorMessage, validateImageFile } from '../utils/uploadValidation';

export default function AdminNewsPage() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ title: '', shortDescription: '', content: '', imageUrl: '', isPublished: true });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 10;

    const [isDragging, setIsDragging] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const loadNews = async (currentPage, currentSearch) => {
        setLoading(true);
        try {
            const res = await newsPostsAPI.getAll(currentPage, pageSize, currentSearch, false);
            const fetchedItems = res.data.items || res.data.Items || (Array.isArray(res.data) ? res.data : []);
            const total = res.data.totalCount || res.data.TotalCount || fetchedItems.length;
            
            setNews(fetchedItems);
            setTotalPages(Math.ceil(total / pageSize) || 1);
        } catch (error) {
            console.error("Помилка завантаження:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadNews(page, searchTerm);
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, page]);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const handleShow = (item = null) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({ title: '', shortDescription: '', content: '', imageUrl: '', isPublished: true });
        }
        setShowModal(true);
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
            loadNews(page, searchTerm);
        } catch (error) {
            console.error("Помилка збереження:", error);
            alert("Помилка збереження!");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Видалити цю новину?')) return;
        try {
            await newsPostsAPI.delete(id);
            loadNews(page, searchTerm);
        } catch (error) {
            console.error("Помилка видалення:", error);
        }
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
        const validationError = validateImageFile(file);
        if (validationError) {
            alert(validationError);
            return;
        }

        setUploadingImage(true);
        try {
            const res = await newsPostsAPI.upload(file);
            setFormData({ ...formData, imageUrl: res.data.url || res.data.filePath });
            setUploadingImage(false);
        } catch (error) {
            console.error('Помилка завантаження:', error);
            alert(getUploadErrorMessage(error));
            setUploadingImage(false);
        }
    };

    let paginationItems = [];
    for (let number = 1; number <= totalPages; number++) {
        paginationItems.push(
            <Pagination.Item key={number} active={number === page} onClick={() => setPage(number)}>
                {number}
            </Pagination.Item>
        );
    }

    return (
        <Container className="mt-5" style={{ color: 'var(--text-main)' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Керування новинами</h2>
                <Button variant="success" onClick={() => handleShow()}>+ Додати новину</Button>
            </div>

            <InputGroup className="mb-4">
                <InputGroup.Text style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                    🔍
                </InputGroup.Text>
                <Form.Control 
                    placeholder="Почніть вводити заголовок або текст для пошуку..." 
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                />
            </InputGroup>

            {loading ? (
                <div className="text-center mt-5"><Spinner animation="border" /></div>
            ) : (
                <>
                    <Table striped bordered hover variant="dark">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Заголовок</th>
                                <th>Дата</th>
                                <th>Статус</th>
                                <th>Дії</th>
                            </tr>
                        </thead>
                        <tbody>
                            {news.length === 0 ? (
                                <tr><td colSpan="5" className="text-center text-muted">Новин не знайдено</td></tr>
                            ) : (
                                news.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.id}</td>
                                        <td>{item.title}</td>
                                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                                        <td>{item.isPublished ? '🟢 Опубліковано' : '🔴 Чернетка'}</td>
                                        <td>
                                            <Button variant="primary" size="sm" className="me-2" onClick={() => handleShow(item)}>Редаг.</Button>
                                            <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>Видал.</Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>

                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center mt-4">
                            <Pagination>{paginationItems}</Pagination>
                        </div>
                    )}
                </>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" data-bs-theme="dark">
                <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>
                    <Modal.Title>{editingId ? 'Редагувати новину' : 'Додати новину'}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
                    <Form onSubmit={handleSave}>
                        <Form.Group className="mb-3">
                            <Form.Label>Заголовок</Form.Label>
                            <Form.Control required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Короткий опис (на Головну сторінку)</Form.Label>
                            <Form.Control required as="textarea" rows={2} value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Повний текст (на сторінку новини)</Form.Label>
                            <Form.Control required as="textarea" rows={6} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} />
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
                            <Form.Check type="checkbox" label="Опублікувати одразу" checked={formData.isPublished} onChange={e => setFormData({...formData, isPublished: e.target.checked})} />
                        </Form.Group>
                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Скасувати</Button>
                            <Button variant="primary" type="submit">Зберегти</Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
}