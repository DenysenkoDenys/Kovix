import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Container, Card, Spinner, Row, Col, Badge, Button, Modal, ListGroup, Form } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, reviewsAPI, friendsAPI, adminUsersAPI } from '../services/api';
import { useFriends } from '../contexts/FriendsContext';
import { formatLastSeen } from '../utils/dateUtils';
import defaultPosterImg from '../assets/NotFoundPoster.webp';
import { API_BASE_URL } from '../utils/apiConfig';
import AdminUserAwardModal from '../components/AdminUserAwardModal';
import { adminUserAwardsAPI } from '../services/api';
import UserTitleBadge from '../components/UserTitleBadge';

function UserPublicProfilePage() {
    const { id } = useParams();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const [userProfile, setUserProfile] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [awards, setAwards] = useState([]);

    const { refreshRequests } = useFriends();
    const [friendStatus, setFriendStatus] = useState('None');

    const [isBlocked, setIsBlocked] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [lastActive, setLastActive] = useState(null);
    const [adjustingAppeals, setAdjustingAppeals] = useState(false);

    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalUsers, setModalUsers] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(5);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');

    const [showAwardModal, setShowAwardModal] = useState(false);
    const [awardToEdit, setAwardToEdit] = useState(null);

    const handleAddAward = () => {
        setAwardToEdit(null);
        setShowAwardModal(true);
    };

    const handleEditAward = (award) => {
        setAwardToEdit(award);
        setShowAwardModal(true);
    };

    const handleDeleteAward = async (awardId) => {
        if (!window.confirm("Видалити це досягнення?")) return;
        try {
            await adminUserAwardsAPI.removeAward(awardId);
            loadData();
        } catch (e) {
            alert("Помилка видалення нагороди");
        }
    };

    useEffect(() => {
        setVisibleReviewsCount(5);
    }, [searchQuery, sortBy]);

    const isAdmin = user?.role === 'Admin';

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileRes, reviewsRes] = await Promise.all([
                usersAPI.getPublicProfile(id),
                reviewsAPI.getByUser(id)
            ]);

            const p = profileRes.data;
            setUserProfile(p);
            p.appealsCount = p.appealsCount ?? 0;
            p.appealsRemaining = typeof p.appealsRemaining !== 'undefined' ? p.appealsRemaining : Math.max(0, 5 - p.appealsCount);
            setIsBlocked(p.isBlocked);
            setIsOnline(p.isOnline);
            setLastActive(p.lastActive);
            setAwards(p.awards || []);

            setFollowersCount(p.followersCount || 0);
            setFollowingCount(p.followingCount || 0);
            setIsFollowing(p.isFollowingByMe || false);

            setReviews(reviewsRes.data);

            if (user && user.id !== parseInt(id)) {
                const statusRes = await friendsAPI.checkStatus(id);
                setFriendStatus(statusRes.data.status);
            }

        } catch (error) {
            console.error("Помилка:", error);
            setUserProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const sortFromUrl = searchParams.get('sort');
        const searchFromUrl = searchParams.get('search');

        if (sortFromUrl) setSortBy(sortFromUrl);
        if (searchFromUrl) setSearchQuery(searchFromUrl);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (sortBy !== 'date_desc') params.set('sort', sortBy);
        if (searchQuery) params.set('search', searchQuery);
        window.history.replaceState(null, '', `?${params.toString()}`);
    }, [sortBy, searchQuery]);

    const getImageUrl = (url, fallback = defaultPosterImg) => {
        if (!url) return fallback;
        if (url.startsWith('http')) return url;

        const cleanPath = url.replace(/\\/g, '/');
        const separator = cleanPath.startsWith('/') ? '' : '/';
        return `${API_BASE_URL}${separator}${cleanPath}`;
    };

    const handleFollowToggle = async () => {
        if (!user) return alert("Увійдіть, щоб підписатися");
        try {
            if (isFollowing) {
                await usersAPI.unfollow(id);
                setIsFollowing(false);
                setFollowersCount(prev => prev - 1);
            } else {
                await usersAPI.follow(id);
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
            }
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data || "Не вдалося змінити підписку";
            alert(errorMsg);
            loadData();
        }
    };

    const openUsersModal = async (type) => {
        setModalTitle(type === 'followers' ? 'Підписники' : 'Підписки');
        setShowModal(true);
        setModalLoading(true);
        setModalUsers([]);

        try {
            const res = type === 'followers'
                ? await usersAPI.getFollowers(id)
                : await usersAPI.getFollowing(id);
            setModalUsers(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setModalLoading(false);
        }
    };

    const handleFriendAction = async () => {
        try {
            if (friendStatus === 'None') {
                await friendsAPI.add(id);
                setFriendStatus('PendingOutgoing');
            } else if (friendStatus === 'PendingOutgoing') {
                await friendsAPI.remove(id);
                setFriendStatus('None');
            } else if (friendStatus === 'Friend') {
                if (!window.confirm("Видалити з друзів?")) return;
                await friendsAPI.remove(id);
                setFriendStatus('None');
            }
            if (refreshRequests) refreshRequests();
        } catch (error) {
            console.error(error);
            loadData();
        }
    };

    const handleAccept = async () => {
        try {
            await friendsAPI.accept(id);
            setFriendStatus('Friend');

            if (refreshRequests) refreshRequests();
        } catch (e) {
            console.error(e);
            alert("Не вдалося прийняти запит");
        }
    };

    const handleReject = async () => {
        try {
            await friendsAPI.remove(id);
            setFriendStatus('None');

            if (refreshRequests) refreshRequests();
        } catch (e) {
            console.error(e);
            alert("Не вдалося відхилити запит");
        }
    };

    const handleBlockAction = async () => {
        if (!isAdmin) return;
        if (!window.confirm("Змінити статус блокування?")) return;

        try {
            await usersAPI.toggleBlock(id);
            await loadData();
        } catch {
            alert("Помилка блокування");
        }
    };

    const handleAdjustAppeals = async (amount) => {
        if (!isAdmin) return;
        if (!window.confirm(`Ви впевнені, що хочете ${amount > 0 ? 'додати' : 'забрати'} ${Math.abs(amount)} апеляцію(й)?`)) return;
        try {
            setAdjustingAppeals(true);
            const res = await adminUsersAPI.adjustAppeals(id, amount);
            const data = res.data;
            setUserProfile(prev => prev ? ({ ...prev, appealsCount: data.appealsCount, appealsRemaining: data.appealsRemaining }) : prev);
            setAdjustingAppeals(false);
        } catch (e) {
            console.error(e);
            setAdjustingAppeals(false);
            alert('Помилка при зміні апеляцій');
        }
    };

    const handleLoadMoreReviews = () => {
        setVisibleReviewsCount(prevCount => prevCount + 5);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('uk-UA', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
    if (!userProfile) return <Container className="mt-5 text-center"><h3>Користувача не знайдено</h3></Container>;

    const isMe = user && user.id === parseInt(id);

    let processedReviews = reviews.filter(review =>
        review.movieTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );

    processedReviews.sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === 'rating_desc') return b.rating - a.rating;
        if (sortBy === 'rating_asc') return a.rating - b.rating;
        return 0;
    });

    const visibleReviews = processedReviews.slice(0, visibleReviewsCount);

    return (
        <Container className="mt-4 mb-5">
            <Card
                className="shadow-sm border-0 mb-4 p-4 text-center"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
            >
                <div className="d-flex justify-content-center mb-3">
                    {userProfile.avatarUrl ? (
                        <img
                            src={getImageUrl(userProfile.avatarUrl)}
                            alt={userProfile.username}
                            className="rounded-circle border"
                            style={{ width: 120, height: 120, objectFit: 'cover', borderColor: 'var(--border-color)' }}
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/120' }}
                        />
                    ) : (
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                            style={{
                                width: 120, height: 120, fontSize: '3.5rem',
                                backgroundColor: 'var(--primary-color)',
                                color: 'var(--btn-text)'
                            }}
                        >
                            {userProfile.username.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>

                <div className="d-flex justify-content-center align-items-center gap-2 mb-1">
                    <h2 className="fw-bold mb-0">{userProfile.username}</h2>
                    <UserTitleBadge
                        role={userProfile.role}
                        selectedAward={userProfile.selectedAward}
                    />
                </div>

                <div className="small fw-bold mb-3" style={{ color: isOnline ? '#57cbde' : 'var(--text-secondary)' }}>
                    {formatLastSeen(lastActive, isOnline)}
                </div>

                <div className="d-flex justify-content-center gap-4 mb-4">
                    <div
                        className="text-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openUsersModal('followers')}
                    >
                        <div className="fw-bold fs-5">{followersCount}</div>
                        <div className="small" style={{ color: 'var(--text-secondary)' }}>Підписників</div>
                    </div>
                    <div
                        className="text-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => openUsersModal('following')}
                    >
                        <div className="fw-bold fs-5">{followingCount}</div>
                        <div className="small" style={{ color: 'var(--text-secondary)' }}>Підписок</div>
                    </div>
                </div>

                {!isMe && user && (
                    <div className="d-flex justify-content-center gap-2 mb-3 flex-wrap">
                        {!isBlocked && (
                            <Button
                                variant={isFollowing ? "outline-secondary" : "primary"}
                                onClick={handleFollowToggle}
                                style={isFollowing ? { color: 'var(--text-main)', borderColor: 'var(--border-color)' } : {}}
                            >
                                {isFollowing ? "Ви підписані" : "Підписатися"}
                            </Button>
                        )}

                        {!isBlocked && (
                            <>
                                {friendStatus === 'None' && (
                                    <Button variant="outline-primary" onClick={handleFriendAction}>Додати в друзі</Button>
                                )}
                                {friendStatus === 'PendingOutgoing' && (
                                    <Button variant="secondary" onClick={handleFriendAction}>Запит надіслано</Button>
                                )}

                                {friendStatus === 'PendingIncoming' && (
                                    <div className="d-flex gap-2">
                                        <Button variant="success" onClick={handleAccept}>✅ Прийняти</Button>
                                        <Button variant="outline-danger" onClick={handleReject}>❌ Відхилити</Button>
                                    </div>
                                )}

                                {friendStatus === 'Friend' && (
                                    <Button variant="outline-danger" onClick={handleFriendAction}>Видалити з друзів</Button>
                                )}
                            </>
                        )}

                        {isAdmin && (
                            <Button variant={isBlocked ? "dark" : "link"} className={!isBlocked ? "text-danger" : ""} onClick={handleBlockAction}>
                                {isBlocked ? "🔓 Розблокувати" : "🚫 Заблокувати"}
                            </Button>
                        )}
                    </div>
                )}

                {isBlocked && <Badge bg="danger" className="align-self-center p-2">⛔ Цей акаунт заблоковано</Badge>}

                {typeof userProfile.appealsRemaining !== 'undefined' && (
                    <div className="mt-3 small text-muted d-flex justify-content-center align-items-center gap-2">
                        {
                            (() => {
                                const count = userProfile.appealsCount ?? 0;
                                const remaining = userProfile.appealsRemaining ?? 0;
                                const total = count + remaining;
                                return <div className="text-center">⚖️ Апеляції: <strong>{count}</strong> / {total} • Залишилось: <strong>{remaining}</strong></div>;
                            })()
                        }
                        {isAdmin && (
                            <div className="d-flex gap-1">
                                <Button size="sm" variant="success" onClick={() => handleAdjustAppeals(1)} disabled={adjustingAppeals}>+1</Button>
                                <Button size="sm" variant="danger" onClick={() => handleAdjustAppeals(-1)} disabled={adjustingAppeals}>-1</Button>
                            </div>
                        )}
                    </div>
                )}

                <p className="mb-0 mt-2 small" style={{ color: 'var(--text-secondary)' }}>
                    На сайті з {new Date(userProfile.createdAt).toLocaleDateString('uk-UA')}
                </p>
            </Card>

            {!isBlocked && (awards.length > 0 || isAdmin) && (
                <div className="mb-4">
                    <h4 className="mb-3 ps-2 border-start border-4" style={{ borderColor: 'var(--primary-color)', color: 'var(--text-main)' }}>
                        🏆 Досягнення
                    </h4>
                    <Row className="g-3">
                        {awards.map(award => (
                            <Col xs={6} sm={4} md={3} lg={2.4} key={award.id} className="text-center position-relative">
                                <Card
                                    className="shadow-sm border-0 h-100 d-flex align-items-center justify-content-center"
                                    style={{
                                        backgroundColor: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        border: '1px solid var(--border-color)',
                                        minHeight: '140px',
                                        transition: 'transform 0.2s, box-shadow 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    <Card.Body className="d-flex flex-column align-items-center justify-content-center py-3">
                                        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                                            {award.icon}
                                        </div>
                                        <div className="fw-bold small text-center" style={{ fontSize: '0.85rem' }}>
                                            {award.name}
                                        </div>
                                        {award.description && (
                                            <div className="text-muted text-center mt-1" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                                                {award.description}
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>

                                {isAdmin && (
                                    <div className="position-absolute top-0 end-0 p-1 d-flex gap-2" style={{ background: 'var(--bg-card)', borderRadius: '0 8px 0 8px', zIndex: 2, border: '1px solid var(--border-color)' }}>
                                        <span
                                            style={{ cursor: 'pointer', fontSize: '0.9rem', opacity: 0.8, transition: 'opacity 0.2s' }}
                                            onClick={() => handleEditAward(award)}
                                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                                            onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                                            title="Редагувати"
                                        >
                                            ✏️
                                        </span>
                                        <span
                                            style={{ cursor: 'pointer', fontSize: '0.9rem', opacity: 0.8, transition: 'opacity 0.2s' }}
                                            onClick={() => handleDeleteAward(award.id)}
                                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                                            onMouseLeave={(e) => e.target.style.opacity = '0.8'}
                                            title="Видалити"
                                        >
                                            ❌
                                        </span>
                                    </div>
                                )}
                            </Col>
                        ))}

                        {isAdmin && (
                            <Col xs={6} sm={4} md={3} lg={2.4} className="text-center">
                                <Card
                                    className="shadow-sm border-0 h-100 d-flex align-items-center justify-content-center"
                                    style={{
                                        backgroundColor: 'transparent',
                                        color: 'var(--text-muted)',
                                        border: '2px dashed var(--border-color)',
                                        minHeight: '140px',
                                        cursor: 'pointer'
                                    }}
                                    onClick={handleAddAward}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Card.Body className="d-flex flex-column align-items-center justify-content-center py-3">
                                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>
                                            ➕
                                        </div>
                                        <div className="fw-bold small text-center" style={{ fontSize: '0.85rem' }}>
                                            Видати досягнення
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        )}
                    </Row>
                </div>
            )}

            {!isBlocked && (
                <>
                    <h4
                        className="mb-4 ps-2 border-start border-4"
                        style={{ borderColor: 'var(--primary-color)', color: 'var(--text-main)' }}
                    >
                        Відгуки користувача ({reviews.length})
                    </h4>

                    {reviews.length > 0 && (
                        <Row className="mb-4">
                            <Col md={7} className="mb-2 mb-md-0">
                                <Form.Control
                                    type="text"
                                    placeholder="🔍 Пошук за назвою фільму..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                                />
                            </Col>
                            <Col md={5}>
                                <Form.Select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                                >
                                    <option value="date_desc">📅 Спочатку нові</option>
                                    <option value="date_asc">📅 Спочатку старі</option>
                                    <option value="rating_desc">⭐ Найкращі оцінки (10-1)</option>
                                    <option value="rating_asc">⭐ Найгірші оцінки (1-10)</option>
                                </Form.Select>
                            </Col>
                        </Row>
                    )}

                    {processedReviews.length === 0 ? (
                        <p style={{ opacity: 0.7, color: 'var(--text-secondary)' }}>
                            {searchQuery ? "За вашим запитом нічого не знайдено." : "Немає відгуків."}
                        </p>
                    ) : (
                        <>
                            <Row>
                                {visibleReviews.map(review => (
                                    <Col md={12} key={review.id} className="mb-3">
                                        <Card className="shadow-sm border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                            <Card.Body>
                                                <div className="d-flex gap-3">
                                                    <Link to={`/movie/${review.movieId}`} className="flex-shrink-0">
                                                        <img
                                                            src={getImageUrl(review.moviePosterUrl || review.posterUrl)}
                                                            alt="Poster"
                                                            className="rounded"
                                                            style={{ width: 60, height: 90, objectFit: 'cover' }}
                                                            onError={(e) => { e.target.src = defaultPosterImg }}
                                                        />
                                                    </Link>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between">
                                                            <h6 className="mb-1">
                                                                <Link to={`/movie/${review.movieId}`} className="text-decoration-none fw-bold" style={{ color: 'var(--text-main)' }}>
                                                                    {review.movieTitle}
                                                                </Link>
                                                            </h6>
                                                            <Badge bg={review.rating >= 8 ? 'success' : review.rating >= 5 ? 'warning' : 'danger'}>
                                                                {review.rating}/10
                                                            </Badge>
                                                        </div>
                                                        <small style={{ color: 'var(--text-secondary)' }}>{formatDate(review.createdAt)}</small>
                                                        <p className="mt-2 mb-2" style={{ whiteSpace: 'pre-wrap', opacity: 0.9 }}>{review.comment}</p>
                                                    </div>
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>

                            {visibleReviewsCount < processedReviews.length && (
                                <div className="text-center mt-3 mb-4">
                                    <Button
                                        variant="outline-primary"
                                        onClick={handleLoadMoreReviews}
                                        style={{ borderRadius: '20px', padding: '8px 24px', fontWeight: 'bold' }}
                                    >
                                        ⬇ Показати ще відгуки
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            <Modal show={showModal} onHide={() => setShowModal(false)} centered contentClassName="bg-card text-main">
                <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                    <Modal.Title>{modalTitle}</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ backgroundColor: 'var(--bg-main)', maxHeight: '60vh', overflowY: 'auto' }}>
                    {modalLoading ? (
                        <div className="text-center p-3"><Spinner animation="border" size="sm" /></div>
                    ) : (
                        <ListGroup variant="flush">
                            {modalUsers.length > 0 ? (
                                modalUsers.map(u => (
                                    <ListGroup.Item
                                        key={u.id}
                                        className="d-flex align-items-center justify-content-between"
                                        style={{ backgroundColor: 'transparent', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                                    >
                                        <div className="d-flex align-items-center gap-2">
                                            <img
                                                src={getImageUrl(u.avatarUrl, 'https://via.placeholder.com/40')}
                                                style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/40' }}
                                            />
                                            <Link
                                                to={`/users/${u.id}`}
                                                className="text-decoration-none fw-bold"
                                                style={{ color: 'var(--text-main)' }}
                                                onClick={() => setShowModal(false)}
                                            >
                                                {u.username}
                                            </Link>
                                            <UserTitleBadge
                                                role={u.role}
                                                selectedAward={u.selectedAward}
                                            />
                                        </div>
                                    </ListGroup.Item>
                                ))
                            ) : (
                                <p className="text-center text-muted mt-3">Список порожній</p>
                            )}
                        </ListGroup>
                    )}
                </Modal.Body>
            </Modal>

            <AdminUserAwardModal
                show={showAwardModal}
                onHide={() => setShowAwardModal(false)}
                targetUserId={id} 
                onAwardAdded={loadData}
                awardToEdit={awardToEdit}
            />

        </Container>
    );
}

export default UserPublicProfilePage;