import { useState, useEffect } from 'react';
import { Navbar, Container, Nav, NavDropdown, Button, Badge } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AdminMovieModal from './AdminMovieModal';
import ThemeSettings from './ThemeSettings';
import { authAPI, moviesAPI } from '../services/api';
import NotificationBell from './NotificationBell';
import { useTheme } from '../contexts/ThemeContext';
import { FaNewspaper } from 'react-icons/fa';
import '../style/App.css';
import defaultAvatarImg from '../assets/NotFoundAvatar.png';
import { API_BASE_URL } from '../utils/apiConfig';
import logoImg from '../assets/Logo.png';
const DEFAULT_AVATAR = defaultAvatarImg;

function Navigation() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [randomLoading, setRandomLoading] = useState(false);

  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [showAddModal, setShowAddModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);

  const [userAvatar, setUserAvatar] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.avatarUrl) setUserAvatar(user.avatarUrl);

      authAPI.getProfile()
        .then(res => {
          setUserAvatar(res.data.avatarUrl);
        })
        .catch(err => console.error("Не вдалося завантажити аватар", err));
    }
  }, [user, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleRandomMovie = async () => {
    if (randomLoading) return;

    try {
      setRandomLoading(true);
      const response = await moviesAPI.getRandom();
      const randomId = response.data.id;

      navigate(`/movie/${randomId}`);
    } catch (error) {
      console.error("Не вдалося знайти випадковий фільм", error);
      alert("Не вдалося підібрати фільм. Можливо, ваші фільтри занадто суворі.");
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <>
      <Navbar
        bg={isDark ? 'dark' : 'light'}
        variant={isDark ? 'dark' : 'light'}
        expand="lg"
        className="mb-4 sticky-top shadow-sm"
      >
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2 text-warning">
            <img
              src={logoImg}
              alt="Kovix Logo"
              height="50"
              className="d-inline-block align-top"
              style={{ objectFit: 'contain' }}
            />
            <span className="fw-bold">Kovix</span>
          </Navbar.Brand>

          <Navbar.Toggle />

          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/movies" className="fw-semibold">
                🎥 Каталог
              </Nav.Link>

              <Nav.Link as={Link} to="/actors" className="fw-semibold">
                🎭 Актори
              </Nav.Link>

              <Nav.Link as={Link} to="/news" className="fw-semibold d-flex align-items-center gap-1">
                <FaNewspaper /> Оголошення
              </Nav.Link>

              <Nav.Link as={Link} to="/tierlists" className="fw-semibold">
                🏆 Тір Лісти
              </Nav.Link>

              <Nav.Link as={Link} to="/membership" className="fw-semibold">
                KovixPRO
              </Nav.Link>
              <Nav.Link as={Link} to="/leaderboard">🏆 Рейтинг</Nav.Link>
            </Nav>
            <Nav className="align-items-center gap-2">

              {user && <NotificationBell />}

              {user && (
                <Nav.Link
                  as={Link}
                  to="/chat"
                  title="Чат"
                  className="fs-5"
                >
                  💬
                </Nav.Link>
              )}

              <Button
                variant={isDark ? "outline-warning" : "warning"}
                size="sm"
                onClick={handleRandomMovie}
                disabled={randomLoading}
                className="d-flex align-items-center gap-1"
              >
                {randomLoading
                  ? <span className="spinner-border spinner-border-sm" />
                  : <>🎲 <span className="d-none d-md-inline">Рандом</span></>
                }
              </Button>

              <Button
                variant="link"
                className="fs-5 text-decoration-none"
                onClick={() => setShowThemeModal(true)}
                title="Тема"
              >
                🎨
              </Button>

              {user ? (
                <>
                  {isAdmin() && (
                    <Button
                      variant="success"
                      size="sm"
                      className="d-none d-lg-inline"
                      onClick={() => setShowAddModal(true)}
                    >
                      ➕
                    </Button>
                  )}

                  <NavDropdown
                    align="end"
                    id="profile-dropdown"
                    title={
                      <div className="d-flex align-items-center gap-2">

                        <img
                          src={userAvatar ? `${API_BASE_URL}${userAvatar}` : DEFAULT_AVATAR}
                          alt="avatar"
                          className="rounded-circle border border-secondary"
                          style={{ width: 32, height: 32, objectFit: 'cover' }}
                          onError={(e) => { e.target.src = DEFAULT_AVATAR; }}
                        />
                        <span className="d-none d-md-inline fw-semibold">
                          {user.username}
                          {user.isPremium && (
                            <span className="ms-1" title="Kovix Premium">👑</span>
                          )}
                        </span>
                      </div>
                    }
                  >
                    <NavDropdown.Header>
                      Привіт, {user.username} 👋
                      {user.isPremium ? (
                        <Badge bg="warning" text="dark" className="ms-2">👑 VIP</Badge>
                      ) : null}
                    </NavDropdown.Header>

                    <NavDropdown.Item as={Link} to="/profile">
                      👤 Профіль
                    </NavDropdown.Item>

                    <NavDropdown.Item as={Link} to="/my-lists">
                      🗂️ Мої списки
                    </NavDropdown.Item>

                    <NavDropdown.Item as={Link} to="/blacklist">
                      🚫 Чорний список
                    </NavDropdown.Item>

                    <NavDropdown.Item as={Link} to="/history">
                      🕰️ Історія
                    </NavDropdown.Item>

                    <NavDropdown.Item as={Link} to="/newsposts">
                      📰 Новини
                    </NavDropdown.Item>

                    <NavDropdown.Item as={Link} to="/forum">
                      💬 Форум
                    </NavDropdown.Item>

                    <NavDropdown.Item as={Link} to="/top">
                      🏆 Топ-100
                    </NavDropdown.Item>


                    {isAdmin() && (
                      <>
                        <NavDropdown.Divider />

                        <NavDropdown.Item
                          onClick={() => setShowAddModal(true)}
                          className="d-lg-none"
                        >
                          ➕ Додати фільм
                        </NavDropdown.Item>

                        <NavDropdown.Item
                          as={Link}
                          to="/admin/reports"
                          className="text-warning"
                        >
                          🛡️ Скарги
                        </NavDropdown.Item>

                        <NavDropdown.Item as={Link} to="/admin/critic-applications" className="text-success">
                          📝 Заявки Критиків
                        </NavDropdown.Item>

                        <NavDropdown.Item as={Link} to="/admin/roles" className="text-info">
                          🕒 Керування ролями
                        </NavDropdown.Item>

                        <NavDropdown.Item as={Link} to="/admin/appeals" className="text-info">
                          ⚖️ Апеляції
                        </NavDropdown.Item>

                        <NavDropdown.Item as={Link} to="/admin/news" className="text-info">
                          📰 Керування новинами
                        </NavDropdown.Item>
                      </>
                    )}

                    {user?.role === 'Moderator' && (
                      <>
                        <NavDropdown.Divider />

                        <NavDropdown.Item as={Link} to="/moderator" className="text-danger">
                          🔒 Модерація
                        </NavDropdown.Item>

                        <NavDropdown.Item as={Link} to="/admin/tierlists" className="text-warning">
                          🏆 Модерація тір лістів
                        </NavDropdown.Item>
                      </>
                    )}

                    {user && (user.role === 'Admin' || user.role === 'Moderator') && (
                      <>
                        <NavDropdown.Divider />
                        <NavDropdown.Item as={Link} to="/admin/forum-moderation">
                          Модерація форуму
                        </NavDropdown.Item>
                        <NavDropdown.Item as={Link} to="/admin/support">
                          📞 Звернення користувачів
                        </NavDropdown.Item>
                      </>
                    )}

                    <NavDropdown.Item as={Link} to="/my-reviews">📝 Мої відгуки</NavDropdown.Item>

                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={handleLogout} className="text-danger">
                      🚪 Вийти
                    </NavDropdown.Item>
                  </NavDropdown>
                </>
              ) : (
                <>
                  <Button as={Link} to="/login" size="sm" variant="outline-primary">
                    Вхід
                  </Button>
                  <Button as={Link} to="/register" size="sm">
                    Реєстрація
                  </Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <AdminMovieModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onSuccess={() => window.location.reload()}
      />

      <ThemeSettings
        show={showThemeModal}
        onHide={() => setShowThemeModal(false)}
      />
    </>
  );
}

export default Navigation;