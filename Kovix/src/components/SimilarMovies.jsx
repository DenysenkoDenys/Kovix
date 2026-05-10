import { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import SlickSlider from "react-slick";
import MovieCard from './MovieCard';
import { moviesAPI } from '../services/api';

const Slider = SlickSlider.default ? SlickSlider.default : SlickSlider;

function SimilarMovies({ movieId }) {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSimilar = async () => {
            try {
                setLoading(true);
                const res = await moviesAPI.getSimilar(movieId);
                setMovies(res.data);
            } catch (error) {
                console.error("Помилка завантаження схожих фільмів:", error);
            } finally {
                setLoading(false);
            }
        };

        if (movieId) {
            fetchSimilar();
        }
    }, [movieId]);

    const sliderSettings = {
        dots: false,
        infinite: movies.length > 4,
        speed: 500,
        slidesToShow: 5,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 4000,
        responsive: [
            { breakpoint: 1200, settings: { slidesToShow: 4 } },
            { breakpoint: 992, settings: { slidesToShow: 3 } },
            { breakpoint: 768, settings: { slidesToShow: 2 } },
            { breakpoint: 480, settings: { slidesToShow: 2 } }
        ]
    };

    if (loading) {
        return (
            <div className="text-center my-4">
                <Spinner animation="border" variant="warning" />
            </div>
        );
    }

    if (movies.length === 0) return null;

    return (
        <div className="similar-movies-section mt-5 mb-4">
            <h4 className="mb-4 border-start border-4 border-warning ps-2 text-white">
                🎬 Схожі проєкти
            </h4>
            <Slider {...sliderSettings}>
                {movies.map((movie) => (
                    <div key={movie.id} className="p-2">
                        <MovieCard movie={movie} />
                    </div>
                ))}
            </Slider>
        </div>
    );
}

export default SimilarMovies;