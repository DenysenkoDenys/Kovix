import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Form, InputGroup, Pagination, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { newsPostsAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';
import defaultPosterImg from '../assets/NotFoundPoster.webp';

export default function AllNewsPage() {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 9; 

    const fetchNews = async (currentPage, currentSearch) => {
        setLoading(true);
        try {
            const res = await newsPostsAPI.getAll(currentPage, pageSize, currentSearch, true);
            const fetchedItems = res.data.items || res.data.Items || (Array.isArray(res.data) ? res.data : []);
            const total = res.data.totalCount || res.data.TotalCount || fetchedItems.length;
            
            setNews(fetchedItems);
            setTotalPages(Math.ceil(total / pageSize) || 1);
        } catch (error) {
            console.error("Помилка завантаження новин:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchNews(page, searchTerm);
        }, 500); 

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, page]); 

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const truncateText = (text, maxLength) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
        <Container className="mt-5 mb-5" style={{ color: 'var(--text-main)' }}>
            <div className="d-flex justify-content-between align-items-end mb-4">
                <h1 className="fw-bold" style={{ color: 'var(--primary-color)' }}>📰 Всі новини</h1>
            </div>

            <Row className="mb-4">
                <Col md={6}>
                    <InputGroup>
                        <InputGroup.Text style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                            🔍
                        </InputGroup.Text>
                        <Form.Control 
                            placeholder="Почніть вводити для пошуку..." 
                            value={searchTerm}
                            onChange={handleSearchChange}
                            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }}
                        />
                    </InputGroup>
                </Col>
            </Row>

            {loading ? (
                <div className="text-center my-5"><Spinner animation="border" variant="primary" /></div>
            ) : news.length === 0 ? (
                <div className="text-center text-muted my-5">За вашим запитом нічого не знайдено 😔</div>
            ) : (
                <>
                    <Row>
                        {news.map(item => {
                            const imageUrl = item.imageUrl 
                                ? (item.imageUrl.startsWith('http') ? item.imageUrl : `${getApiBaseUrl()}${item.imageUrl}`) 
                                : defaultPosterImg;

                            return (
                                <Col key={item.id} xs={12} md={4} className="mb-4">
                                    <Card className="h-100 shadow-sm border-0 news-card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <div style={{ height: '200px', overflow: 'hidden' }}>
                                            <img src={imageUrl} alt={item.title} className="w-100 h-100" style={{ objectFit: 'cover' }} />
                                        </div>
                                        <Card.Body className="d-flex flex-column">
                                            <small className="text-muted mb-2">📅 {new Date(item.createdAt).toLocaleDateString('uk-UA')}</small>
                                            <Card.Title className="fw-bold">{item.title}</Card.Title>
                                            <Card.Text style={{ color: 'var(--text-secondary)', flexGrow: 1 }}>
                                                {truncateText(item.shortDescription || item.content, 120)}
                                            </Card.Text>
                                            <Button as={Link} to={`/news/${item.id}`} variant="outline-primary" className="mt-auto align-self-start rounded-pill px-4" size="sm">
                                                Читати далі
                                            </Button>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                    
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center mt-4">
                            <Pagination>{paginationItems}</Pagination>
                        </div>
                    )}
                </>
            )}
            <style>{`.news-card:hover { transform: translateY(-5px); transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(0,0,0,0.15) !important; }`}</style>
        </Container>
    );
}