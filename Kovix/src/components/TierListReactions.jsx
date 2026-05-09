import { useState, useEffect } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import { tierListsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function TierListReactions({ tierListId }) {
    const { user } = useAuth();

    const [stats, setStats] = useState({
        Likes: 0,
        Dislikes: 0,
        Fire: 0,
        UserReaction: null
    });

    const [loading, setLoading] = useState(true);

    const normalize = (data) => ({
        Likes: data.likes ?? data.Likes ?? 0,
        Dislikes: data.dislikes ?? data.Dislikes ?? 0,
        Fire: data.fire ?? data.Fire ?? 0,
        UserReaction: data.userReaction ?? data.UserReaction ?? null
    });

    const loadReactions = async () => {
        try {
            const res = await tierListsAPI.getReactions(tierListId);
            setStats(normalize(res.data));
        } catch (error) {
            console.error("Помилка завантаження реакцій", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReactions();
    }, [tierListId]);

    const handleReact = async (type) => {
        if (!user) {
            alert("Потрібно увійти, щоб залишати реакції!");
            return;
        }

        const oldStats = { ...stats };

        const updated = { ...stats };

        if (updated.UserReaction === type) {
            updated[type] = Math.max(0, (updated[type] || 0) - 1);
            updated.UserReaction = null;
        } else {
            if (updated.UserReaction) {
                const prev = updated.UserReaction;
                updated[prev] = Math.max(0, (updated[prev] || 0) - 1);
            }

            updated[type] = (updated[type] || 0) + 1;
            updated.UserReaction = type;
        }

        setStats(updated);

        try {
            await tierListsAPI.toggleReaction(tierListId, type);

            await loadReactions();

        } catch (error) {
            setStats(oldStats);
            console.error("Помилка реакції", error);
        }
    };

    if (loading) return null;

    return (
        <ButtonGroup className="my-3 shadow-sm rounded-pill overflow-hidden">
            <Button
                variant={stats.UserReaction === 'Like' ? 'primary' : 'outline-primary'}
                onClick={() => handleReact('Like')}
                className="d-flex align-items-center gap-1 border-0"
            >
                👍 {stats.Likes}
            </Button>

            <Button
                variant={stats.UserReaction === 'Dislike' ? 'danger' : 'outline-danger'}
                onClick={() => handleReact('Dislike')}
                className="d-flex align-items-center gap-1 border-0 border-start"
            >
                👎 {stats.Dislikes}
            </Button>

            <Button
                variant={stats.UserReaction === 'Fire' ? 'warning' : 'outline-warning'}
                onClick={() => handleReact('Fire')}
                className="d-flex align-items-center gap-1 border-0 border-start"
            >
                🔥 {stats.Fire}
            </Button>
        </ButtonGroup>
    );
}

export default TierListReactions;