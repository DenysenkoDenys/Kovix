import { useState, useEffect, useRef } from 'react';
import { Spinner, Button, Modal, Form, Tabs, Tab } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { moviePhotosAPI } from '../services/api';
import { FaPlus, FaTrash, FaCloudUploadAlt, FaTimes, FaShareAlt, FaChevronLeft, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { API_BASE_URL } from '../utils/apiConfig';
import { getUploadErrorMessage, validateImageFile } from '../utils/uploadValidation';

const PhotoLightbox = ({ show, onHide, photos, initialIndex, movieTitle, movieId, isAdmin, onDeletePhoto }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

    useEffect(() => {
        if (show && initialIndex !== null && initialIndex !== undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentIndex(initialIndex);
        }
    }, [show, initialIndex]);

    useEffect(() => {
        if (photos && currentIndex >= photos.length) {
            if (photos.length === 0 && show) {
                onHide(); 
            } else {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setCurrentIndex(Math.max(0, photos.length - 1)); 
            }
        }
    }, [photos.length]);

    const goToPrev = () => setCurrentIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
    const goToNext = () => setCurrentIndex(prev => (prev === photos.length - 1 ? 0 : prev + 1));

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL}${url}`;
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!show) return;
            if (e.key === 'ArrowLeft') goToPrev();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'Escape') onHide();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [show, goToPrev, goToNext, onHide]);

    if (!photos || photos.length === 0 || currentIndex === null || currentIndex === undefined) return null;

    const currentPhoto = photos[currentIndex];
    if (!currentPhoto) return null;

    const handleShare = async () => {
        const imageUrl = getImageUrl(currentPhoto.imageUrl);

        if (navigator.share) {
            try {
                await navigator.share({
                    title: movieTitle,
                    text: `Дивіться кадр з ${movieTitle} на Kovix!`,
                    url: imageUrl,
                });
            } catch {
                console.log('Помилка або скасування поширення');
            }
        } else {
            try {
                await navigator.clipboard.writeText(imageUrl);
                alert('Посилання на світлину скопійовано в буфер обміну!');
            } catch {
                alert('Не вдалося скопіювати посилання.');
            }
        }
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            dialogClassName="modal-fullscreen bg-black modal-lightbox"
            contentClassName="bg-black"
            centered
        >
            <Modal.Body className="p-0 position-relative d-flex align-items-center justify-content-center h-100 bg-black">

                <div className="position-absolute top-0 start-0 w-100 d-flex justify-content-between align-items-center px-4 py-3" style={{ zIndex: 10 }}>
                    <div className="d-flex align-items-center gap-1 text-white fs-5" style={{ opacity: 0.8 }} onClick={onHide}>
                        <FaTimes style={{ cursor: 'pointer', scale: 1.2 }} />
                        <span className="ms-2 fw-semibold" style={{ cursor: 'pointer' }}>Закрити</span>
                    </div>
                    <div className="d-flex align-items-center gap-4 text-white">
                        <span className="fs-5">{currentIndex + 1} з {photos.length}</span>
                        
                        {isAdmin && (
                            <FaTrash
                                style={{ cursor: 'pointer', scale: 1.1, color: '#ff4d4d' }}
                                title="Видалити світлину"
                                onClick={() => onDeletePhoto(currentPhoto.id)}
                            />
                        )}

                        <FaShareAlt
                            style={{ cursor: 'pointer', scale: 1.2 }}
                            title="Поділитися"
                            onClick={handleShare}
                        />
                    </div>
                </div>

                <div className="text-center position-relative w-100 h-100 d-flex justify-content-center align-items-center px-5">
                    <img
                        src={getImageUrl(currentPhoto.imageUrl)}
                        alt={`Movie still ${currentIndex + 1}`}
                        className="img-fluid"
                        style={{ maxHeight: 'calc(100vh - 120px)', objectFit: 'contain' }}
                    />
                </div>

                <button
                    className="position-absolute start-0 top-50 translate-middle-y ms-3 p-3 bg-transparent border-0 text-white"
                    onClick={goToPrev}
                    style={{ zIndex: 5, opacity: 0.7 }}
                    onMouseEnter={(e) => e.target.style.opacity = 1}
                    onMouseLeave={(e) => e.target.style.opacity = 0.7}
                >
                    <FaChevronLeft style={{ scale: 2 }} />
                </button>
                <button
                    className="position-absolute end-0 top-50 translate-middle-y me-3 p-3 bg-transparent border-0 text-white"
                    onClick={goToNext}
                    style={{ zIndex: 5, opacity: 0.7 }}
                    onMouseEnter={(e) => e.target.style.opacity = 1}
                    onMouseLeave={(e) => e.target.style.opacity = 0.7}
                >
                    <FaChevronRight style={{ scale: 2 }} />
                </button>

                <div className="position-absolute bottom-0 start-0 w-100 px-4 py-3 text-white" style={{ zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="fw-bold fs-5 text-white">Кадр {currentIndex + 1}</div>
                    {movieTitle && (
                        <div className="fw-normal mt-1" style={{ fontSize: '1rem', color: 'var(--primary-color)' }}>
                            <Link
                                to={`/movie/${movieId}`}
                                className="text-white opacity-90 ms-1 fw-semibold text-decoration-none"
                                onClick={onHide}
                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                            >
                                {movieTitle}
                            </Link>
                        </div>
                    )}
                </div>

            </Modal.Body>
        </Modal>
    );
};

const MoviePhotos = ({ movieId, movieTitle }) => {
    const { isAdmin } = useAuth();

    const [photos, setPhotos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('upload');

    const [newPhotoUrl, setNewPhotoUrl] = useState('');

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const [lightboxIndex, setLightboxIndex] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    const loadPhotos = async () => {
        setIsLoading(true);
        try {
            const res = await moviePhotosAPI.getByMovie(movieId);
            setPhotos(res.data);
        } catch (err) {
            console.error("Помилка завантаження світлин:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (movieId) loadPhotos();
    }, [movieId]);

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${API_BASE_URL}${url}`;
    };

    const handleDelete = async (photoId, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Видалити цю світлину?")) return;
        try {
            await moviePhotosAPI.delete(movieId, photoId);
            loadPhotos();
        } catch (err) {
            console.error(err);
            alert("Помилка видалення.");
        }
    };

    const openLightbox = (index) => {
        setLightboxIndex(index);
        setIsLightboxOpen(true);
    };

    const handleExpandPhotos = () => {
        if (photos.length > 11) {
            openLightbox(0); 
        } else {
            setShowAll(!showAll); 
        }
    };

    const handleLastPhotoClick = (index) => {
        if (photos.length > 11) {
            openLightbox(index); 
        } else {
            setShowAll(true); 
        }
    };

    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        const validFiles = [];

        for (const file of files) {
            const validationError = validateImageFile(file);
            if (validationError) {
                alert(validationError);
                return;
            }
            validFiles.push(file);
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);
    };
    const onFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = [];

        for (const file of files) {
            const validationError = validateImageFile(file);
            if (validationError) {
                alert(validationError);
                return;
            }
            validFiles.push(file);
        }

        setSelectedFiles(prev => [...prev, ...validFiles]);
    };
    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (activeTab === 'upload' && selectedFiles.length > 0) {
                const token = localStorage.getItem('token');
                const uploadPromises = selectedFiles.map(async (file) => {
                    const formData = new FormData();
                    formData.append('files', file);
                    const response = await fetch(`${API_BASE_URL}/api/movies/${movieId}/photos/upload`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    if (!response.ok) throw new Error(`Не вдалося завантажити: ${file.name}`);
                });
                await Promise.all(uploadPromises);
            }
            else if (activeTab === 'url' && newPhotoUrl.trim() !== '') {
                await moviePhotosAPI.addUrl(movieId, newPhotoUrl);
            }
            setNewPhotoUrl('');
            setSelectedFiles([]);
            setShowModal(false);
            loadPhotos();
        } catch (err) {
            console.error(err);
            alert(getUploadErrorMessage(err, 'Помилка збереження світлин.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setNewPhotoUrl('');
        setSelectedFiles([]);
    };

    if (isLoading) return <div className="p-4 text-center"><Spinner animation="border" style={{ color: 'var(--primary-color)' }} /></div>;
    if (photos.length === 0 && (!isAdmin || !isAdmin())) return null;

    const visiblePhotos = showAll ? photos : photos.slice(0, 5);
    const remainingCount = photos.length - 5;

    return (
        <div className="mt-5 mb-5 pb-5">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div className="d-flex align-items-center gap-2 cursor-pointer" onClick={handleExpandPhotos}>
                    <div style={{ width: '4px', height: '24px', backgroundColor: 'var(--primary-color)', borderRadius: '2px' }}></div>
                    <h3 className="mb-0 fw-bold" style={{ color: 'var(--text-main)', cursor: 'pointer' }}>
                        Світлини
                        <span className="text-muted fs-5 ms-2">{photos.length}</span>
                        {photos.length > 5 && (
                            <span className="ms-2" style={{ color: 'var(--primary-color)', display: 'inline-block', transition: 'transform 0.3s' }}>
                                {photos.length > 11 ? (
                                    <FaChevronRight size={18} />
                                ) : (
                                    <FaChevronDown
                                        style={{
                                            transform: showAll ? 'rotate(180deg)' : 'rotate(-90deg)',
                                            transition: 'transform 0.3s'
                                        }}
                                        size={18}
                                    />
                                )}
                            </span>
                        )}
                    </h3>
                </div>

                {isAdmin && isAdmin() && (
                    <Button variant="link" className="text-decoration-none fw-bold" style={{ color: 'var(--primary-color)' }} onClick={() => setShowModal(true)}>
                        <FaPlus className="me-1" /> Додати світлину
                    </Button>
                )}
            </div>

            {photos.length === 0 ? (
                <div className="text-center p-4 rounded" style={{ border: '1px dashed var(--border-color)' }}>
                    <p className="text-muted mb-0">Світлин ще немає.</p>
                </div>
            ) : (
                <>
                    {visiblePhotos.length >= 1 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
                            {visiblePhotos.slice(0, 2).map((photo, index) => (
                                <div
                                    key={photo.id}
                                    className="position-relative overflow-hidden rounded"
                                    style={{
                                        height: '200px',
                                        cursor: 'pointer',
                                        overflow: 'hidden'
                                    }}
                                    onClick={() => openLightbox(index)}
                                >
                                    <img
                                        src={getImageUrl(photo.imageUrl)}
                                        alt="Movie still"
                                        className="w-100 h-100"
                                        style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                                    />
                                    {isAdmin && isAdmin() && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            className="position-absolute top-0 end-0 m-2"
                                            onClick={(e) => handleDelete(photo.id, e)}
                                            style={{ zIndex: 10, opacity: 0.7 }}
                                            onMouseEnter={(e) => e.target.style.opacity = 1}
                                            onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                        >
                                            <FaTrash />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {visiblePhotos.length > 2 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {visiblePhotos.slice(2).map((photo, index) => {
                                const actualIndex = index + 2;
                                const isLastVisible = !showAll && actualIndex === 4 && remainingCount > 0;

                                return (
                                    <div
                                        key={photo.id}
                                        className="position-relative overflow-hidden rounded"
                                        style={{
                                            height: '140px',
                                            cursor: 'pointer',
                                            overflow: 'hidden'
                                        }}
                                        onClick={() => isLastVisible ? handleLastPhotoClick(actualIndex) : openLightbox(actualIndex)}
                                    >
                                        <img
                                            src={getImageUrl(photo.imageUrl)}
                                            alt="Movie still"
                                            className="w-100 h-100"
                                            style={{ objectFit: 'cover', transition: 'transform 0.3s ease' }}
                                            onMouseEnter={(e) => !isLastVisible && (e.currentTarget.style.transform = 'scale(1.05)')}
                                            onMouseLeave={(e) => !isLastVisible && (e.currentTarget.style.transform = 'scale(1)')}
                                        />
                                        {isLastVisible && (
                                            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                                                 style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                                <span className="text-white fw-bold" style={{ fontSize: '1.3rem' }}>+{remainingCount}</span>
                                            </div>
                                        )}

                                        {isAdmin && isAdmin() && !isLastVisible && (
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                className="position-absolute top-0 end-0 m-2"
                                                onClick={(e) => handleDelete(photo.id, e)}
                                                style={{ zIndex: 10, opacity: 0.7 }}
                                                onMouseEnter={(e) => e.target.style.opacity = 1}
                                                onMouseLeave={(e) => e.target.style.opacity = 0.7}
                                            >
                                                <FaTrash />
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered contentClassName="bg-card text-main border-secondary">
                <Modal.Header closeButton style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                    <Modal.Title>Додати світлини</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-main)' }}>
                    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                        <Tab eventKey="upload" title="📁 Завантажити файли">
                            <div
                                className="mt-3 p-5 text-center rounded d-flex flex-column align-items-center justify-content-center"
                                onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                                onClick={() => fileInputRef.current.click()}
                                style={{
                                    border: `2px dashed ${isDragging ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                    backgroundColor: isDragging ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-input)',
                                    cursor: 'pointer', transition: 'all 0.2s ease'
                                }}
                            >
                                <FaCloudUploadAlt size={40} className="mb-2" style={{ color: 'var(--primary-color)' }} />
                                <h6 className="fw-bold">Перетягніть файли сюди</h6>
                                <p className="text-muted small mb-0">або натисніть для вибору з комп'ютера</p>
                                <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={onFileSelect} style={{ display: 'none' }} />
                            </div>
                            {selectedFiles.length > 0 && (
                                <div className="mt-3">
                                    <p className="mb-2 text-muted small">Вибрано файлів: {selectedFiles.length}</p>
                                    <div className="d-flex flex-wrap gap-2">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="position-relative rounded" style={{ width: '80px', height: '80px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                                <img src={URL.createObjectURL(file)} alt="preview" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                                                <Button variant="danger" size="sm" className="position-absolute top-0 end-0 m-1 p-1 d-flex align-items-center justify-content-center" style={{ width: '20px', height: '20px', fontSize: '10px' }} onClick={(e) => { e.stopPropagation(); removeSelectedFile(index); }}>
                                                    <FaTrash />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Tab>
                        <Tab eventKey="url" title="🔗 Вставити посилання">
                            <Form.Group className="mt-3">
                                <Form.Label className="text-muted">URL Зображення</Form.Label>
                                <Form.Control type="url" placeholder="https://..." value={newPhotoUrl} onChange={(e) => setNewPhotoUrl(e.target.value)} className="bg-input text-main border-secondary" />
                            </Form.Group>
                        </Tab>
                    </Tabs>
                </Modal.Body>
                <Modal.Footer style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                    <Button variant="secondary" onClick={handleCloseModal}>Скасувати</Button>
                    <Button variant="primary" onClick={handleUploadSubmit} disabled={isSaving || (activeTab === 'upload' && selectedFiles.length === 0) || (activeTab === 'url' && newPhotoUrl.trim() === '')} style={{ backgroundColor: 'var(--primary-color)', borderColor: 'var(--primary-color)' }}>
                        {isSaving ? <Spinner size="sm" /> : 'Зберегти світлини'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <PhotoLightbox
                show={isLightboxOpen}
                onHide={() => setIsLightboxOpen(false)}
                photos={photos}
                initialIndex={lightboxIndex}
                movieTitle={movieTitle}
                movieId={movieId}
                isAdmin={isAdmin && isAdmin()}
                onDeletePhoto={(photoId) => handleDelete(photoId)}
            />
        </div>
    );
};

export default MoviePhotos;