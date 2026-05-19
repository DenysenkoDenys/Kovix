import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Badge, Button, Modal, Form } from 'react-bootstrap';
import { actorsAPI, moviesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FaEdit, FaTrash } from 'react-icons/fa';
import defaultPosterImg from '../assets/NotFoundPoster.webp';
import { API_BASE_URL } from '../utils/apiConfig';

function VoiceActorDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [actor, setActor] = useState(null);
    const [voiceRoles, setVoiceRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({ name: '', bio: '', photoUrl: '', birthDate: '' });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadVoiceActorData();
    }, [id]);

    const loadVoiceActorData = async () => {
        try {
            setLoading(true);
            
            const actorRes = await actorsAPI.getById(id);
            setActor(actorRes.data);

            const moviesRes = await moviesAPI.getAll(1, 500);
            if (moviesRes.data && moviesRes.data.items) {
                const allMovies = moviesRes.data.items;
                const allVoiceRoles = [];

                for (const movie of allMovies) {
                    try {
                        const token = localStorage.getItem('token');
                        const response = await fetch(`${API_BASE_URL}/api/movies/${movie.id}/characters`, {
                            headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                        });

                        if (response.ok) {
                            const characters = await response.json();
                            for (const character of characters) {
                                if (character.voiceActors && Array.isArray(character.voiceActors)) {
                                    for (const voiceActor of character.voiceActors) {
                                        if (voiceActor.actorId === parseInt(id)) {
                                            allVoiceRoles.push({
                                                id: character.characterId,
                                                characterName: character.characterName,
                                                characterImageUrl: character.imageUrl,
                                                movieTitle: movie.title,
                                                movieId: movie.id,
                                                language: voiceActor.language,
                                                isOriginal: voiceActor.isOriginal,
                                                isMainRole: voiceActor.isMainRole
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    } catch {}
                
                    setVoiceRoles(allVoiceRoles);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getPhotoUrl = (url) => {
        if (!url) return defaultPosterImg;
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL}${url}`;
    };

    const handleDelete = async () => {
        if (!window.confirm(`Видалити актора озвучки "${actor.name}"? Це незворотня дія!`)) return;
        try {
            await actorsAPI.delete(id);
            navigate(-1); 
        } catch (error) {
            console.error('Помилка видалення:', error);
            alert('Помилка при видаленні актора. Можливо, він має зв\'язки у базі даних.');
        }
    };

    const handleShowEdit = () => {
        setEditData({
            name: actor.name || '',
            bio: actor.bio || '',
            photoUrl: actor.photoUrl || '',
            birthDate: actor.birthDate ? actor.birthDate.split('T')[0] : '' 
        });
        setShowEditModal(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                id: parseInt(id), 
                name: editData.name,
                bio: editData.bio,
                photoUrl: editData.photoUrl,
                birthDate: editData.birthDate ? new Date(editData.birthDate).toISOString() : null
            };
            
            await actorsAPI.update(id, payload);
            setShowEditModal(false);
            loadVoiceActorData(); 
        } catch (error) {
            console.error('Помилка редагування:', error.response?.data || error.message);
            alert('Не вдалося оновити актора.');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" /></Container>;
    if (!actor) return <Container className="mt-5 text-center"><h2>Актора озвучки не знайдено</h2></Container>;

    return (
        <Container className="mt-5 mb-5">
            <Row>
                <Col md={4} className="mb-4">
                    <img
                        src={getPhotoUrl(actor.photoUrl)}
                        alt={actor.name}
                        className="img-fluid rounded shadow w-100"
                        style={{ objectFit: 'cover', maxHeight: '500px' }}
                        onError={(e) => e.target.src = defaultPosterImg}
                    />
                </Col>
                <Col md={8}>
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <h1 className="display-4 fw-bold mb-0">{actor.name}</h1>
                        {isAdmin && isAdmin() && (
                            <div className="d-flex gap-2">
                                <Button variant="warning" size="sm" onClick={handleShowEdit}>
                                    <FaEdit className="me-2" /> Редагувати
                                </Button>
                                <Button variant="danger" size="sm" onClick={handleDelete}>
                                    <FaTrash className="me-2" /> Видалити
                                </Button>
                            </div>
                        )}
                    </div>

                    {actor.birthDate && (
                        <p className="text-muted fs-5">
                            📅 Дата народження: {new Date(actor.birthDate).toLocaleDateString('uk-UA')}
                        </p>
                    )}

                    <h4 className="mt-4 border-bottom pb-2" style={{ borderColor: 'var(--border-color)' }}>Про актора</h4>
                    <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{actor.bio || "Біографія відсутня."}</p>

                    {voiceRoles && voiceRoles.length > 0 ? (
                        <div className="mt-5">
                            <h4 className="border-bottom pb-2 mb-4">Озвучені персонажі ({voiceRoles.length})</h4>
                            <Row>
                                {voiceRoles.map(role => (
                                    <Col xs={12} lg={6} key={`${role.id}-${role.movieId}`} className="mb-4 d-flex">
                                        <Link to={`/character/${role.id}`} className="text-decoration-none text-reset w-100">
                                            <div 
                                                className="d-flex align-items-center gap-3 p-3 rounded h-100" 
                                                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', transition: 'all 0.3s ease', minHeight: '100px' }} 
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'} 
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                                            >
                                                <img
                                                    src={
                                                        role.characterImageUrl
                                                            ? (role.characterImageUrl.startsWith('http') ? role.characterImageUrl : `${API_BASE_URL}${role.characterImageUrl}`)
                                                            : defaultPosterImg
                                                    }
                                                    alt={role.characterName}
                                                    className="rounded flex-shrink-0"
                                                    style={{ width: '60px', height: '90px', objectFit: 'cover' }}
                                                    onError={(e) => e.target.src = defaultPosterImg}
                                                />
                                                <div className="d-flex flex-column justify-content-center flex-grow-1">
                                                    <div className="fw-bold text-main">{role.characterName}</div>
                                                    <div className="text-muted small">{role.movieTitle}</div>
                                                    <div className="text-muted small">{role.language}</div>
                                                    <div className="d-flex flex-wrap gap-1 mt-2">
                                                        {role.isOriginal && <Badge bg="info">🎙️ Оригінальна</Badge>}
                                                        {role.isMainRole && <Badge bg="success">⭐ Головна</Badge>}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    ) : (
                        <div className="alert alert-info mt-4">
                            Озвучені персонажі для цього актора озвучки не знайдені
                        </div>
                    )}
                </Col>
            </Row>

            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered contentClassName="bg-card text-main border-secondary">
                <Modal.Header closeButton style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                    <Modal.Title>Редагувати актора</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-main)' }}>
                    <Form onSubmit={handleEditSubmit}>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Ім'я актора</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        required
                                        value={editData.name}
                                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                                        className="bg-input text-main border-secondary"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Дата народження</Form.Label>
                                    <Form.Control 
                                        type="date" 
                                        value={editData.birthDate}
                                        onChange={(e) => setEditData({...editData, birthDate: e.target.value})}
                                        className="bg-input text-main border-secondary"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        
                        <Form.Group className="mb-3">
                            <Form.Label>URL Зображення</Form.Label>
                            <Form.Control 
                                type="text" 
                                value={editData.photoUrl}
                                onChange={(e) => setEditData({...editData, photoUrl: e.target.value})}
                                className="bg-input text-main border-secondary"
                            />
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label>Біографія</Form.Label>
                            <Form.Control 
                                as="textarea"
                                rows={5}
                                value={editData.bio}
                                onChange={(e) => setEditData({...editData, bio: e.target.value})}
                                className="bg-input text-main border-secondary"
                            />
                        </Form.Group>

                        <div className="d-flex justify-content-end gap-2">
                            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Скасувати</Button>
                            <Button variant="warning" type="submit" disabled={isSaving}>
                                {isSaving ? <Spinner size="sm" /> : 'Зберегти зміни'}
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
}

export default VoiceActorDetailPage;