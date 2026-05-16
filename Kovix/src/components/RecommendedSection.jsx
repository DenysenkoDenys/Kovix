import { useState, useEffect } from 'react';
import { Row, Col, Spinner } from 'react-bootstrap';
import { moviesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import MovieCard from './MovieCard';

export default function RecommendedSection() {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const fetchRecommended = async () => {
            try {
                const res = await moviesAPI.getRecommended();
                setMovies(res.data);
            } catch (error) {
                console.error("Помилка завантаження рекомендацій:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecommended();
    }, [user]);

    if (loading) {
        return <div className="text-center my-4"><Spinner animation="border" variant="primary" /></div>;
    }

    if (movies.length === 0) {
        return null; 
    }

    return (
        <div className="mb-5 mt-4">
            <h3 className="mb-3 fw-bold" style={{ color: 'var(--text-main)' }}>
                ✨ Рекомендовано для вас
            </h3>
            <p className="text-muted small mb-4">На основі ваших переглядів та вподобань</p>
            
            <Row>
                {movies.map(movie => (
                    <Col key={movie.id} xs={6} sm={4} md={3} lg={2} className="mb-4">
                        <MovieCard movie={movie} />
                    </Col>
                ))}
            </Row>
        </div>
    );
}