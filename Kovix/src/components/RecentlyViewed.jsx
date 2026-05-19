import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../utils/apiConfig';
import defaultPosterImg from '../assets/NotFoundPoster.webp';

const RecentlyViewed = () => {
    const [history, setHistory] = useState([]);
    const scrollRef = useRef(null);

    useEffect(() => {
        const savedHistory = JSON.parse(localStorage.getItem('kovix_recent_movies') || '[]');
        setHistory(savedHistory);
    }, []);

    useEffect(() => {
        const currentRef = scrollRef.current;
        
        const handleWheel = (e) => {
            if (currentRef) {
                e.preventDefault(); 
                currentRef.scrollLeft += e.deltaY;
            }
        };

        if (currentRef) {
            currentRef.addEventListener('wheel', handleWheel, { passive: false }); 
        }

        return () => {
            if (currentRef) {
                currentRef.removeEventListener('wheel', handleWheel);
            }
        };
    }, [history]); 

    if (history.length === 0) return null;

    return (
        <div className="mt-5 mb-4">
            <h4 className="fw-bold mb-3 border-start border-4 border-info ps-2" style={{ color: 'var(--text-main)' }}>
                👀 Ви переглядали раніше
            </h4>
            
            <Row 
                ref={scrollRef} 
                className="flex-nowrap overflow-auto pb-3" 
                style={{ scrollbarWidth: 'thin' }}
            >
                {history.map((movie) => (
                    <Col key={movie.id} xs={5} sm={4} md={3} lg={2} className="flex-shrink-0">
                        <Link to={`/movie/${movie.id}`} className="text-decoration-none">
                            <Card className="h-100 border-0 shadow-sm hover-card bg-transparent">
                                <div style={{ overflow: 'hidden', borderRadius: '8px' }}>
                                    {
                                        (() => {
                                            const poster = movie.posterUrl;
                                            const src = poster
                                                ? (poster.startsWith('http') ? poster : `${API_BASE_URL}${poster}`)
                                                : defaultPosterImg;
                                            return (
                                                <Card.Img
                                                    variant="top"
                                                    src={src}
                                                    alt={movie.title}
                                                    style={{ height: '220px', objectFit: 'cover', transition: 'transform 0.3s' }}
                                                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                                />
                                            );
                                        })()
                                    }
                                </div>
                                <div className="mt-2 text-center text-truncate fw-bold" style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                    {movie.title}
                                </div>
                            </Card>
                        </Link>
                    </Col>
                ))}
            </Row>
        </div>
    );
};

export default RecentlyViewed;