import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Container, Row, Col, Card, Spinner, Form, InputGroup, Button, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { actorsAPI, contentFilterAPI } from '../services/api';
import { FaSearch, FaUserFriends, FaEdit, FaTrash } from 'react-icons/fa';
import defaultPosterImg from '../assets/NotFoundAvatar.png';
import AdminActorModal from '../components/AdminActorModal';
import { API_BASE_URL } from '../utils/apiConfig';
const ACTORS_PER_PAGE = 18;

function ActorsPage() {
    const { user, isAdmin } = useAuth(); 
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedActor, setSelectedActor] = useState(null);
    const [actors, setActors] = useState([]);
    
    const [blockedActorIds, setBlockedActorIds] = useState([]); 
    
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadActors();
        if (user) {
            loadBlockedActors();
        }
    }, [user]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const loadActors = async () => {
        try {
            const res = await actorsAPI.getAll();
            setActors(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Error loading actors:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadBlockedActors = async () => {
        try {
            const res = await contentFilterAPI.getBlockedActors();
            setBlockedActorIds(res.data.map(a => a.actorId)); 
        } catch (error) {
            console.error("Помилка завантаження чорного списку:", error);
        }
    };

    const handleDelete = async (e, id, name) => {
        e.preventDefault();
        if (window.confirm(`Видалити актора ${name} з бази даних?`)) {
            try {
                await actorsAPI.delete(id);
                loadActors();
            } catch {
                alert("Помилка видалення");
            }
        }
    };

    const handleEditClick = (e, actor) => {
        e.preventDefault();
        setSelectedActor(actor);
        setShowEditModal(true);
    };

    const handleToggleBlock = async (e, id, isBlocked) => {
        e.preventDefault(); 
        
        try {
            if (isBlocked) {
                await contentFilterAPI.unblockActor(id);
                setBlockedActorIds(prev => prev.filter(actorId => actorId !== id));
            } else {
                if (!window.confirm("Ви більше не побачите фільмів з цим актором у своїй стрічці. Заблокувати?")) return;
                await contentFilterAPI.blockActor(id);
                setBlockedActorIds(prev => [...prev, id]);
            }
        } catch (err) {
            console.error(err);
            alert("Помилка при зміні статусу блокування.");
        }
    };

    const getPhotoUrl = (url) => {
        if (!url) return defaultPosterImg;
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL}${url}`;
    };

    const filteredActors = actors.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastActor = currentPage * ACTORS_PER_PAGE;
    const indexOfFirstActor = indexOfLastActor - ACTORS_PER_PAGE;
    const currentActors = filteredActors.slice(indexOfFirstActor, indexOfLastActor);
    const totalPages = Math.ceil(filteredActors.length / ACTORS_PER_PAGE);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo(0, 0);
    };

    if (loading) return (
        <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
            <div className="text-center">
                <Spinner animation="border" variant="primary" size="lg" className="mb-2" />
                <p className="text-muted">Завантаження зірок...</p>
            </div>
        </Container>
    );

    return (
        <Container className="mt-5 mb-5">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5 gap-3">
                <div className="d-flex align-items-center gap-3">
                    <div className="bg-primary p-3 rounded-4 shadow-sm text-white d-flex align-items-center justify-content-center">
                        <FaUserFriends size={28} />
                    </div>
                    <div>
                        <h2 className="mb-0 fw-bold text-main">Актори</h2>
                        <p className="text-muted mb-0 small">Знайдено: {filteredActors.length}</p>
                    </div>
                </div>

                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <InputGroup className="shadow-sm rounded-pill overflow-hidden border-secondary">
                        <InputGroup.Text className="bg-card border-0 text-muted ps-3">
                            <FaSearch />
                        </InputGroup.Text>
                        <Form.Control
                            placeholder="Знайти актора..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-card border-0 text-main py-2 shadow-none"
                        />
                    </InputGroup>
                </div>
            </div>

            {filteredActors.length > 0 ? (
                <>
                    <Row className="g-4">
                        {currentActors.map(actor => {
                            const isBlocked = blockedActorIds.includes(actor.id);

                            return (
                            <Col key={actor.id} xs={6} sm={4} md={3} lg={2}>
                                <div className="position-relative">
                                    {isAdmin && isAdmin() && (
                                        <div className="position-absolute top-0 end-0 p-2 d-flex gap-2" style={{ zIndex: 10 }}>
                                            <Button variant="success" size="sm" className="rounded-circle p-1 admin-btn" onClick={(e) => handleEditClick(e, actor)} style={{ width: '32px', height: '32px' }}>
                                                <FaEdit size={14} />
                                            </Button>
                                            <Button variant="danger" size="sm" className="rounded-circle p-1 admin-btn" onClick={(e) => handleDelete(e, actor.id, actor.name)} style={{ width: '32px', height: '32px' }}>
                                                <FaTrash size={12} />
                                            </Button>
                                        </div>
                                    )}
                                    <Link to={`/actors/${actor.id}`} className="text-decoration-none">
                                        <Card className="h-100 border-0 shadow-sm bg-card actor-card-hover rounded-4 overflow-hidden position-relative">
                                            <div className="position-relative overflow-hidden" style={{ aspectRatio: '2/3' }}>
                                                <Card.Img
                                                    variant="top"
                                                    src={getPhotoUrl(actor.photoUrl)}
                                                    className="w-100 h-100 object-fit-cover"
                                                    style={{ opacity: isBlocked ? 0.5 : 1 }}
                                                    onError={(e) => { e.target.src = defaultPosterImg; }}
                                                />
                                            </div>
                                            <Card.Body className="p-3 text-center d-flex flex-column justify-content-between">
                                                <div>
                                                    <Card.Title className="mb-0 text-main fw-bold text-truncate" style={{ fontSize: '0.9rem', textDecoration: isBlocked ? 'line-through' : 'none' }}>
                                                        {actor.name}
                                                    </Card.Title>
                                                    <small className="text-muted d-block mb-2">Актор</small>
                                                </div>
                                                
                                                {user && (
                                                    <Button
                                                        variant={isBlocked ? "outline-success" : "outline-danger"}
                                                        size="sm"
                                                        className="w-100 mt-2"
                                                        onClick={(e) => handleToggleBlock(e, actor.id, isBlocked)}
                                                    >
                                                        {isBlocked ? "✅ Розблокувати" : "🚫 Блокувати"}
                                                    </Button>
                                                )}
                                            </Card.Body>
                                        </Card>
                                    </Link>
                                </div>
                            </Col>
                        )})}
                    </Row>

                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center mt-5">
                            <Pagination className="custom-pagination">
                                <Pagination.First onClick={() => handlePageChange(1)} disabled={currentPage === 1} />
                                <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} />

                                {[...Array(totalPages)].map((_, idx) => {
                                    const page = idx + 1;
                                    if (page === 1 || page === totalPages || (page >= currentPage - 2 && page <= currentPage + 2)) {
                                        return (
                                            <Pagination.Item key={page} active={page === currentPage} onClick={() => handlePageChange(page)}>
                                                {page}
                                            </Pagination.Item>
                                        );
                                    }
                                    if (page === currentPage - 3 || page === currentPage + 3) {
                                        return <Pagination.Ellipsis key={page} />;
                                    }
                                    return null;
                                })}

                                <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} />
                                <Pagination.Last onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages} />
                            </Pagination>
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-5 text-muted">
                    <h3>Нікого не знайдено 😔</h3>
                </div>
            )}

            <style>{`
                .custom-pagination .page-link { background-color: var(--bg-card); border-color: var(--border-color); color: var(--text-main); margin: 0 2px; border-radius: 8px; }
                .custom-pagination .page-item.active .page-link { background-color: #0d6efd; border-color: #0d6efd; }
                .custom-pagination .page-item.disabled .page-link { background-color: var(--bg-main); opacity: 0.5; }
                .admin-btn { opacity: 0.8; transition: 0.2s; }
                .admin-btn:hover { opacity: 1; transform: scale(1.1); }
                .actor-card-hover { transition: 0.3s; }
                .actor-card-hover:hover { transform: translateY(-5px); }
            `}</style>

            <AdminActorModal
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                actorToEdit={selectedActor}
                onSuccess={loadActors}
            />
        </Container>
    );
}

export default ActorsPage;