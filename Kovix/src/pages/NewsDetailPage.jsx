import { useState, useEffect } from 'react';
import { Container, Spinner, Alert, Button, Image } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { newsPostsAPI } from '../services/api';
import { getApiBaseUrl } from '../utils/apiConfig';
import defaultPosterImg from '../assets/NotFoundPoster.webp';

export default function NewsDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [newsItem, setNewsItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await newsPostsAPI.getById(id);
                setNewsItem(res.data);
            } catch (err) {
                setError('Новину не знайдено або сталася помилка.');
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [id]);

    if (loading) return <Container className="text-center mt-5"><Spinner animation="border" /></Container>;
    if (error) return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
    if (!newsItem) return null;

    const imageUrl = newsItem.imageUrl 
        ? (newsItem.imageUrl.startsWith('http') ? newsItem.imageUrl : `${getApiBaseUrl()}${newsItem.imageUrl}`) 
        : defaultPosterImg;

    return (
        <Container className="mt-5 mb-5" style={{ maxWidth: '800px', color: 'var(--text-main)' }}>
            <Button variant="outline-secondary" className="mb-4" onClick={() => navigate(-1)}>
                &larr; Назад
            </Button>
            
            <h1 className="fw-bold mb-3">{newsItem.title}</h1>
            <p className="text-muted mb-4">📅 {new Date(newsItem.createdAt).toLocaleDateString('uk-UA')}</p>

            <Image 
                src={imageUrl} 
                alt={newsItem.title} 
                fluid 
                className="w-100 rounded-4 shadow-sm mb-4" 
                style={{ maxHeight: '450px', objectFit: 'cover' }} 
            />

            <div 
                className="fs-5" 
                style={{ lineHeight: '1.8' }}
                dangerouslySetInnerHTML={{ __html: newsItem.content?.replace(/\n/g, '<br />') }}
            />
        </Container>
    );
}