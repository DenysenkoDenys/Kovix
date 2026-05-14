import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEnvelope, FaTelegram, FaGithub, FaInstagram, FaFilm } from 'react-icons/fa';

function Footer() {
    return (
        <footer className="bg-card border-top border-secondary mt-auto py-5 text-main">
            <Container>
                <Row className="gy-4">
                    <Col lg={4} md={6}>
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <FaFilm className="text-primary" size={24} />
                            <h4 className="fw-bold mb-0">Kovix</h4>
                        </div>
                        <p className="text-muted small">
                            Ваш персональний гід у світі кіно. Знаходьте улюблених акторів, 
                            читайте відгуки та створюйте власні списки перегляду.
                        </p>
                    </Col>

                    <Col lg={2} md={6} className="ps-lg-5">
                        <h6 className="fw-bold mb-3 text-uppercase">Посилання</h6>
                        <ul className="list-unstyled small d-flex flex-column gap-2">
                            <li><Link to="/movies" className="text-muted text-decoration-none">Фільми</Link></li>
                            <li><Link to="/actors" className="text-muted text-decoration-none">Актори</Link></li>
                            <li><Link to="/faq" className="text-muted text-decoration-none">FAQ</Link></li>
                            <li><Link to="/terms" className="text-muted text-decoration-none">Правила</Link></li>
                            <li><Link to="/privacy" className="text-muted text-decoration-none">Приватність</Link></li>
                        </ul>
                    </Col>

                    <Col lg={3} md={6}>
                        <h6 className="fw-bold mb-3 text-uppercase">Контакти</h6>
                        <ul className="list-unstyled small d-flex flex-column gap-2">
                            <li className="d-flex align-items-center gap-2 text-muted">
                                <FaEnvelope className="text-primary" /> support@kovix.com
                            </li>
                            <li className="d-flex align-items-center gap-2 text-muted">
                                <FaTelegram className="text-primary" /> @kovix_support
                            </li>
                        </ul>
                    </Col>

                    <Col lg={3} md={6}>
                        <h6 className="fw-bold mb-3 text-uppercase">Ми в мережі</h6>
                        <div className="d-flex gap-3">
                            <a href="#" className="text-muted hover-primary"><FaGithub size={20} /></a>
                            <a href="#" className="text-muted hover-primary"><FaInstagram size={20} /></a>
                            <a href="#" className="text-muted hover-primary"><FaTelegram size={20} /></a>
                        </div>
                    </Col>
                </Row>

                <hr className="my-4 border-secondary" />

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 small text-muted">
                    <span>© 2026 Kovix Project. Всі права захищені.</span>
                    <div className="d-flex gap-3">
                        <Link to="/faq" className="text-muted text-decoration-none">FAQ</Link>
                        <Link to="/terms" className="text-muted text-decoration-none">Умови</Link>
                        <Link to="/privacy" className="text-muted text-decoration-none">Конфіденційність</Link>
                    </div>
                </div>
            </Container>

            <style>{`
                .hover-primary:hover { color: var(--bs-primary) !important; transition: 0.2s; }
                footer { background-color: var(--bg-card) !important; }
            `}</style>
        </footer>
    );
}

export default Footer;