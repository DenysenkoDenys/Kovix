import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Button, Modal, Form, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, friendsAPI, moviesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../contexts/FriendsContext';
import { useChatConnection } from '../hooks/useChatConnection';
import MovieStats from '../components/MovieStats';
import QuizStatsComponent from '../components/QuizStatsComponent';
import { formatLastSeen } from '../utils/dateUtils';
import { useTheme } from '../contexts/ThemeContext';
import defaultAvatarImg from '../assets/NotFoundAvatar.png';
import { API_BASE_URL } from '../utils/apiConfig';
import BecomeCriticBanner from '../components/BecomeCriticBanner';
import AdminUserAwardModal from '../components/AdminUserAwardModal';
import { adminUserAwardsAPI } from '../services/api';
import UserTitleBadge from '../components/UserTitleBadge';
const DEFAULT_AVATAR = defaultAvatarImg

function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [shouldDeleteAvatar, setShouldDeleteAvatar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [blockedGenres, setBlockedGenres] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);

  const { logout, login, user: currentUser } = useAuth();
  const { refreshRequests } = useFriends();
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardToEdit, setAwardToEdit] = useState(null);

  const handleAddAward = () => { setAwardToEdit(null); setShowAwardModal(true); };
  const handleEditAward = (award) => { setAwardToEdit(award); setShowAwardModal(true); };

  const handleDeleteAward = async (id) => {
    if (!window.confirm("Видалити цю досягнення?")) return;
    try {
      await adminUserAwardsAPI.removeAward(id);
      loadProfile();
    } catch (e) { alert("Помилка видалення"); }
  };

  useEffect(() => {
    loadProfile();
    loadGenres();
    if (!currentUser?.isBlocked) {
      loadFriends();
    }
  }, [currentUser]);

  useEffect(() => {
    if (profile && profile.blockedGenres) {
      setBlockedGenres(profile.blockedGenres.split(',').map(g => g.trim()));
    }
  }, [profile]);

  const localConnection = useChatConnection(async (conn) => {
    if (currentUser?.isBlocked) return;

    conn.on('UserStatusChanged', (userId, isOnline, lastActive) => {
      setFriends(prev =>
        prev.map(f =>
          String(f.id) === String(userId)
            ? { ...f, isOnline, lastActive }
            : f
        )
      );
    });
  });

  useEffect(() => {
    if (!localConnection || currentUser?.isBlocked) return;

    const syncFriendsStatus = async () => {
      try {
        let attempts = 0;
        while (localConnection.state !== "Connected" && attempts < 50) {
          await new Promise(r => setTimeout(r, 50));
          attempts++;
        }

        if (localConnection.state === "Connected") {
          await localConnection.invoke("GetFriendsStatus");
        }
      } catch (err) {
        console.error('Помилка синхронізації статусів:', err);
      }
    };

    syncFriendsStatus();
  }, [localConnection, currentUser?.isBlocked]);

  const loadProfile = async () => {
    try {
      const res = await authAPI.getProfile();
      setProfile(res.data);
    } catch (e) {
      console.error('❌ Помилка завантаження профіля:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadGenres = async () => {
    try {
      const res = await moviesAPI.getFilters();
      if (res.data && res.data.genres) {
        setAvailableGenres(res.data.genres);
      }
    } catch (e) {
      console.error("Не вдалося завантажити жанри", e);
    }
  };

  const loadFriends = async () => {
    try {
      const res = await friendsAPI.getMyFriends();
      setFriends(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
  };

  const handlePasswordChangeInput = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmitPasswordChange = async () => {
    const { currentPassword, newPassword, confirmNewPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      alert("Будь ласка, заповніть всі поля");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert("Нові паролі не співпадають!");
      return;
    }

    if (newPassword.length < 6) {
      alert("Пароль має бути не менше 6 символів");
      return;
    }

    try {
      await authAPI.changePassword({
        currentPassword,
        newPassword
      });
      alert("Пароль успішно змінено! ✅");
      handleClosePasswordModal();
    } catch (err) {
      console.error(err);
      alert(err.response?.data || "Помилка зміни паролю. Перевірте поточний пароль.");
    }
  };

  const handleAccept = async (id) => {
    try {
      await friendsAPI.accept(id);
      setFriends(prev => prev.map(f => f.id === id ? { ...f, status: 'Friend' } : f));
      refreshRequests();
    } catch { alert("Помилка прийняття"); }
  };

  const handleRemove = async (id) => {
    try {
      await friendsAPI.remove(id);
      setFriends(prev => prev.filter(f => f.id !== id));
      refreshRequests();
    } catch { alert("Помилка"); }
  };

  const handleLogout = async () => {
    try {
      if (localConnection && localConnection.state === "Connected") {
        await localConnection.stop();
      }
      if (presenceConnection && presenceConnection.state === "Connected") {
        await presenceConnection.stop();
      }
    } catch (error) {
      console.error("Помилка при закритті з'єднання:", error);
    }
    logout();
    navigate('/');
  };

  const handleOpenEdit = () => {
    setEditName(profile.username);
    setSelectedFile(null);
    setShouldDeleteAvatar(false);
    setPreviewUrl(profile.avatarUrl ? `${API_BASE_URL}${profile.avatarUrl}` : null);
    setShowEdit(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShouldDeleteAvatar(false);
  };

  const handleDeletePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setShouldDeleteAvatar(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setShouldDeleteAvatar(false);
      } else {
        alert('Будь ласка, завантажте файл зображення');
      }
    }
  };

  const handleSaveChanges = async () => {
    try {
      const formData = new FormData();
      formData.append('Username', editName);
      if (selectedFile) formData.append('Avatar', selectedFile);
      formData.append('DeleteAvatar', shouldDeleteAvatar);

      const res = await authAPI.updateProfile(formData);
      setProfile(res.data);

      const token = localStorage.getItem('token');
      login(token, res.data.username, res.data.role, res.data.isBlocked);

      setShowEdit(false);
    } catch {
      alert("Не вдалося оновити профіль");
    }
  };

  const handleGenreToggle = (genre) => {
    if (blockedGenres.includes(genre)) {
      setBlockedGenres(blockedGenres.filter(g => g !== genre));
    } else {
      setBlockedGenres([...blockedGenres, genre]);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await authAPI.updateSettings({ blockedGenres });
      setShowSettings(false);
      setProfile(prev => ({ ...prev, blockedGenres: blockedGenres.join(',') }));
      alert("Налаштування збережено! Фільми з цими жанрами будуть приховані.");
    } catch (e) {
      console.error(e);
      alert("Помилка збереження налаштувань");
    }
  };

  if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" /></Container>;

  if (!profile) {
    return (
      <Container className="mt-5 text-center">
        <h3>⚠️ Помилка авторизації</h3>
        <p className="text-muted">Схоже, ваша сесія закінчилась.</p>
        <Button variant="primary" onClick={handleLogout}>Увійти знову</Button>
      </Container>
    );
  }

  const incomingRequests = friends.filter(f => f.status === 'PendingIncoming');
  const myFriendsList = friends.filter(f => f.status === 'Friend');

  return (
    <Container className="mt-5 mb-5">

      {profile.isBlocked && (
        <Alert variant="danger" className="mb-4 shadow-sm border-danger">
          <Alert.Heading className="d-flex align-items-center gap-2">
            🚫 <strong>ВАШ АКАУНТ ЗАБЛОКОВАНО</strong>
          </Alert.Heading>
          <p>
            Ви обмежені у діях. Ви не можете користуватися чатом, додавати друзів та переглядати профілі інших користувачів.
          </p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button as={Link} to="/appeal" variant="outline-danger" className="fw-bold">
              ⚖️ Оскаржити блокування
            </Button>
          </div>
        </Alert>
      )}

      <Row>
        <Col md={4} className="mb-4">
          <Card className="shadow-sm border-0 text-center p-4">
            <div className="mb-3 d-flex justify-content-center">
              <img
                src={profile.avatarUrl ? `${API_BASE_URL}${profile.avatarUrl}` : DEFAULT_AVATAR}
                alt="Profile"
                className="rounded-circle border"
                style={{ width: 150, height: 150, objectFit: 'cover', opacity: profile.isBlocked ? 0.5 : 1 }}
                onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
              />
            </div>

            <div className="d-flex justify-content-center align-items-center mb-1">
              <h3 className="mb-0">{profile.username}</h3>
              <UserTitleBadge
                role={profile.role}
                selectedAward={profile.selectedAward}
              />
            </div>
            <p className="text-muted">{profile.email}</p>

            <div className="d-flex justify-content-center mb-3">
              {profile.isBlocked ? (
                <Badge bg="danger" className="px-3 py-2 fs-6">⛔ Заблоковано</Badge>
              ) : (
                <Badge
                  bg={profile.role === 'Admin' ? 'danger' : 'info'}
                  className="px-3 py-2 fs-6"
                  style={{ minWidth: 160 }}
                >
                  {profile.role === 'Admin' ? '👑 Адміністратор' : '👤 Користувач'}
                </Badge>
              )}
            </div>

            {typeof profile.appealsRemaining !== 'undefined' && (
              <div className="mb-3 small text-muted">⚖️ Апеляції: <strong>{profile.appealsCount ?? 0}</strong> / 5 • Залишилось: <strong>{profile.appealsRemaining}</strong></div>
            )}

            <div className="d-grid gap-2 mt-auto">
              {profile.role === 'Admin' && (
                <Button variant="warning" className="fw-bold mb-2" onClick={() => navigate('/admin/reports')}>
                  🛑 Всі скарги
                </Button>
              )}

              <Button variant="outline-primary" onClick={handleOpenEdit} disabled={profile.isBlocked}>
                {profile.isBlocked ? 'Редагування недоступне' : '✏️ Редагувати'}
              </Button>

              <Button
                variant="outline-warning"
                onClick={() => setShowPasswordModal(true)}
                disabled={profile.isBlocked}
                className="mt-2"
              >
                🔑 Змінити пароль
              </Button>

              <Button
                onClick={() => setShowSettings(true)}
                disabled={profile.isBlocked}
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = 'rgba(128, 128, 128, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                🛡️ Фільтр контенту
              </Button>

              <Button variant="outline-danger" onClick={handleLogout}>Вийти</Button>
            </div>
          </Card>
        </Col>

        <Col md={8}>
          <div className="mb-5">
            <h4 className="mb-3 border-start border-4 border-info ps-2">📊 Моя кіно-статистика</h4>
            <MovieStats />
          </div>

          {profile.isBlocked ? (
            <div className="text-center mt-5 text-muted">
              <h4>🔒 Доступ до друзів обмежено</h4>
              <p>Оскільки ваш акаунт заблоковано, ви не можете взаємодіяти зі списком друзів.</p>
            </div>
          ) : (
            <>
              {incomingRequests.length > 0 && (
                <div className="mb-5">
                  <h4 className="mb-3 border-start border-4 border-warning ps-2">🔔 Нові запити ({incomingRequests.length})</h4>
                  {incomingRequests.map(req => (
                    <div key={req.id} className="d-flex justify-content-between align-items-center p-3 mb-2 rounded shadow-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <Link to={`/users/${req.id}`} className="d-flex align-items-center text-decoration-none" style={{ color: 'var(--text-main)' }}>

                        <div className="rounded-circle bg-secondary d-flex justify-content-center align-items-center me-3" style={{ width: 50, height: 50, overflow: 'hidden' }}>
                          <img
                            src={req.avatarUrl ? `${API_BASE_URL}${req.avatarUrl}` : DEFAULT_AVATAR}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                          />
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <strong>{req.username}</strong>
                          <UserTitleBadge
                            role={req.role}
                            selectedAward={req.selectedAward}
                          />
                        </div>
                      </Link>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="success" onClick={() => handleAccept(req.id)}>✅</Button>
                        <Button size="sm" variant="danger" onClick={() => handleRemove(req.id)}>❌</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h4 className="mb-3 border-start border-4 border-primary ps-2">👥 Мої друзі ({myFriendsList.length})</h4>
              {myFriendsList.length === 0 ? <p className="text-muted">У вас поки немає друзів.</p> : (
                <Row>
                  {myFriendsList.map(friend => {
                    const isOnline = friend.isOnline === true;
                    const borderColor = isOnline ? '#57cbde' : 'transparent';
                    const statusText = formatLastSeen(friend.lastActive, isOnline);
                    const statusColor = isOnline ? '#57cbde' : '#909090';
                    return (
                      <Col xs={6} md={4} lg={3} key={friend.id} className="mb-3">
                        <Link to={`/users/${friend.id}`} className="text-decoration-none">
                          <Card className="h-100 text-center shadow-sm border-0 p-3 hover-card">

                            <div className="mx-auto mb-2 rounded-circle bg-secondary d-flex justify-content-center align-items-center position-relative" style={{ width: 80, height: 80, overflow: 'hidden', border: `3px solid ${borderColor}`, transition: 'border-color 0.3s' }}>
                              <img
                                src={friend.avatarUrl ? `${API_BASE_URL}${friend.avatarUrl}` : DEFAULT_AVATAR}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                              />
                            </div>
                            <Card.Title className="fs-6 text-truncate text-dark mb-1">{friend.username}</Card.Title>
                            <div className="small mb-2 fw-bold" style={{ color: statusColor, fontSize: '0.75rem' }}>{statusText}</div>
                            <Button variant="link" className="text-danger p-0 small" style={{ textDecoration: 'none', fontSize: '0.85rem' }} onClick={(e) => { e.preventDefault(); if (window.confirm(`Видалити ${friend.username} з друзів?`)) handleRemove(friend.id); }}>Видалити</Button>
                          </Card>
                        </Link>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </>
          )}
        </Col>
      </Row>

      <Row className="mt-5">
        <Col>
          {profile.isBlocked ? (
            <div className="text-center text-muted">
              <h4>🔒 Доступ до тестів обмежено</h4>
              <p>Оскільки ваш акаунт заблоковано, ви не можете проходити тести знання.</p>
            </div>
          ) : (
            <QuizStatsComponent />
          )}
        </Col>
      </Row>

      <BecomeCriticBanner />

      <Modal show={showEdit} onHide={() => setShowEdit(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
          <Modal.Title>Редагування профілю</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Імʼя</Form.Label>
              <Form.Control
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Аватар</Form.Label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  padding: '30px',
                  border: `2px dashed ${isDragging ? '#0d6efd' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  backgroundColor: isDragging ? 'rgba(13, 110, 253, 0.1)' : 'var(--bg-main)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  marginBottom: '10px'
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{
                    display: 'none'
                  }}
                  id="avatar-file-input"
                />
                <label
                  htmlFor="avatar-file-input"
                  style={{
                    cursor: 'pointer',
                    display: 'block',
                    margin: 0
                  }}
                >
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📁</div>
                  <div style={{ color: 'var(--text-main)', marginBottom: '5px', fontWeight: '500' }}>
                    {isDragging ? '⬇️ Перетягніть файл сюди' : '🖱️ Перетягніть аватар сюди або клікніть'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Формати: JPG, PNG, GIF, WebP
                  </div>
                </label>
              </div>

              {previewUrl && (
                <div className="mt-3 d-flex align-items-center gap-3 p-3 rounded" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <img src={previewUrl} alt="preview" className="rounded" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                  <div>
                    <div style={{ color: 'var(--text-main)', fontWeight: '500', marginBottom: '8px' }}>✅ Новий аватар готовий</div>
                    <Button variant="danger" size="sm" onClick={handleDeletePhoto}>🗑️ Видалити</Button>
                  </div>
                </div>
              )}
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: 'var(--bg-card)', borderTopColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setShowEdit(false)}>Скасувати</Button>
          <Button variant="primary" onClick={handleSaveChanges}>Зберегти</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSettings} onHide={() => setShowSettings(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
          <Modal.Title>🛡️ Фільтр контенту</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
          <p className="small" style={{ opacity: 0.8 }}>
            Оберіть жанри, які ви <strong>НЕ хочете</strong> бачити у стрічці новин та каталозі.
          </p>
          <div className="d-flex flex-wrap gap-2">
            {availableGenres.length === 0 ? (
              <div className="w-100 text-center py-3"><Spinner size="sm" /> Завантаження жанрів...</div>
            ) : (
              availableGenres.map(genre => {
                const isBlocked = blockedGenres.includes(genre);
                return (
                  <div
                    key={genre}
                    onClick={() => handleGenreToggle(genre)}
                    style={{
                      padding: '8px 12px',
                      border: isBlocked ? '1px solid #dc3545' : '1px solid var(--border-color)',
                      borderRadius: '20px',
                      backgroundColor: isBlocked ? '#dc3545' : 'transparent',
                      color: isBlocked ? 'white' : 'var(--text-main)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {isBlocked ? '🚫' : ''} {genre.charAt(0).toUpperCase() + genre.slice(1)}
                  </div>
                );
              })
            )}
          </div>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: 'var(--bg-card)', borderTopColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={() => setShowSettings(false)}>Скасувати</Button>
          <Button variant="danger" onClick={handleSaveSettings}>Зберегти обмеження</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showPasswordModal} onHide={handleClosePasswordModal} centered>
        <Modal.Header closeButton style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
          <Modal.Title>🔐 Зміна паролю</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Поточний пароль</Form.Label>
              <Form.Control
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChangeInput}
                style={{
                  backgroundColor: isDark ? '#2b3035' : '#fff',
                  color: isDark ? '#fff' : '#000',
                  borderColor: 'var(--border-color)'
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Новий пароль</Form.Label>
              <Form.Control
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChangeInput}
                style={{
                  backgroundColor: isDark ? '#2b3035' : '#fff',
                  color: isDark ? '#fff' : '#000',
                  borderColor: 'var(--border-color)'
                }}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Підтвердіть новий пароль</Form.Label>
              <Form.Control
                type="password"
                name="confirmNewPassword"
                value={passwordData.confirmNewPassword}
                onChange={handlePasswordChangeInput}
                style={{
                  backgroundColor: isDark ? '#2b3035' : '#fff',
                  color: isDark ? '#fff' : '#000',
                  borderColor: 'var(--border-color)'
                }}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: 'var(--bg-card)', borderTopColor: 'var(--border-color)' }}>
          <Button variant="secondary" onClick={handleClosePasswordModal}>Скасувати</Button>
          <Button variant="warning" onClick={handleSubmitPasswordChange}>Змінити</Button>
        </Modal.Footer>
      </Modal>

      <div className="mb-4">
        <h5 className="fw-bold mb-3 text-muted">Досягнення ({profile.awards?.length || 0})</h5>

        <div className="d-flex flex-wrap gap-2">
          {profile.awards?.map(award => (
            <div
              key={award.id}
              className="d-flex align-items-center p-2 rounded shadow-sm position-relative"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: '150px'
              }}
            >
              <div className="fs-2 me-3" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {award.icon}
              </div>
              <div>
                <div className="fw-bold text-main" style={{ fontSize: '0.95rem' }}>{award.name}</div>
                {award.description && (
                  <div className="text-muted" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                    {award.description}
                  </div>
                )}
              </div>

              {currentUser?.role === 'Admin' && (
                <div className="position-absolute top-0 end-0 p-1 d-flex gap-2" style={{ background: 'var(--bg-card)', borderRadius: '0 8px 0 8px', zIndex: 2 }}>
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
            </div>
          ))}

          {currentUser?.role === 'Admin' && (
            <div
              className="d-flex align-items-center justify-content-center rounded p-3"
              style={{ border: '2px dashed rgba(255,255,255,0.2)', cursor: 'pointer', minWidth: '150px' }}
              onClick={handleAddAward}
            >
              <span className="text-muted fw-bold"><i className="bi bi-plus-lg"></i> Видати досягнення</span>
            </div>
          )}
        </div>
      </div>

      <Form.Group className="mb-4">
        <Form.Label className="fw-bold">Оберіть ваше звання для чатів і коментарів:</Form.Label>
        <Form.Select
          value={profile.selectedAward?.id || ""}
          onChange={async (e) => {
            const val = e.target.value;
            const awardId = val ? parseInt(val) : null;
            try {
              const response = await authAPI.updateTitle(awardId);
              await loadProfile();
            } catch (error) {
              console.error('Деталі:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
              });
              alert('Помилка: ' + (error.response?.data?.message || error.message));
              await loadProfile();
            }
          }}
        >
          <option value="">Немає звання</option>
          {profile.awards?.map(aw => (
            <option key={aw.id} value={aw.id}>{aw.icon} {aw.name}</option>
          ))}
        </Form.Select>
      </Form.Group>

      <AdminUserAwardModal
        show={showAwardModal}
        onHide={() => setShowAwardModal(false)}
        targetUserId={profile.id}
        onAwardAdded={loadProfile}
        awardToEdit={awardToEdit}
      />

    </Container>
  );
}

export default ProfilePage;