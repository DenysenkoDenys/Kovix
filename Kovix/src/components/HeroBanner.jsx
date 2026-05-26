import { useState, useEffect } from 'react';
import { Carousel, Spinner, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { moviesAPI } from '../services/api';
import { resolveMediaUrl } from '../utils/apiConfig';
import '../style/HeroBanner.css';

function HeroBanner() {
    const [latestItems, setLatestItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLatest = async () => {
            try {
                const res = await moviesAPI.getLatestReleases();
                setLatestItems((res.data || []).slice(0, 3));
            } catch (error) {
                console.error("Помилка завантаження банера:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLatest();
    }, []);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center banner-placeholder">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    if (latestItems.length === 0) return null;

    return (
        <div className="hero-banner-container mb-5 shadow-sm">
            <Carousel
                interval={5000}
                pause="hover"
                controls={true}
                indicators={true}
                wrap={true}
                className="hero-carousel"
            >
                {latestItems.map((item) => {
                    const bannerImageUrl = resolveMediaUrl(item.bannerUrl || item.posterUrl, '');
                    return (
                    <Carousel.Item key={item.id} className="banner-item">
                        <Link to={`/movie/${item.id}`}>
                            <div className="banner-image-wrapper">
                                <img
                                    className="banner-img-bg"
                                    src={bannerImageUrl}
                                    alt=""
                                    fetchpriority="high"
                                    aria-hidden="true"
                                />
                                <img
                                    className="banner-img-poster"
                                    src={bannerImageUrl}
                                    alt={item.title}
                                />
                                <div className="banner-overlay"></div>
                            </div>

                            <Carousel.Caption className="banner-caption text-start">
                                <h2 className="banner-title fw-bold text-white mb-2" style={{ textShadow: '0 0 10px #00d2ff, 0 0 20px #00d2ff' }}>
                                    {item.title}
                                </h2>

                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <Badge bg="warning" text="dark" className="fs-6">
                                        Новинка
                                    </Badge>

                                    {item.type === 'Series' && (
                                        <Badge bg="info" className="fs-6">
                                            {item.latestSeason} сезон {item.latestEpisode ? `, ${item.latestEpisode} серія` : ''}
                                        </Badge>
                                    )}
                                </div>

                                <p className="banner-description d-none d-md-block text-light">
                                   {item.description}
                                </p>
                            </Carousel.Caption>
                        </Link>
                    </Carousel.Item>
                    );
                })}
            </Carousel>
        </div>
    );
}

export default HeroBanner;