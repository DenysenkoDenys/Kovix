import { useState, useEffect } from 'react';
import { chatAPI } from '../services/api';
import '../style/MessageReply.css';

export default function MessageReply({ messageId, onReplySelect }) {
    const [replies, setReplies] = useState([]);
    const [showReplies, setShowReplies] = useState(false);
    const [repliesCount, setRepliesCount] = useState(0);

    useEffect(() => {
        loadReplies();
    }, [messageId]);

    const loadReplies = async () => {
        try {
            const res = await chatAPI.getReplies(messageId);
            setReplies(res.data);
            setRepliesCount(res.data.length);
        } catch (err) {
            console.error('Помилка завантаження відповідей:', err);
        }
    };

    return (
        <div className="message-reply-container">
            {repliesCount > 0 && (
                <button
                    className="show-replies-btn"
                    onClick={() => setShowReplies(!showReplies)}
                >
                    <i className="bi bi-chat-left-dots"></i>
                    {repliesCount} відповід{repliesCount % 10 === 1 && repliesCount !== 11 ? 'і' : 'і'}
                </button>
            )}

            {showReplies && (
                <div className="replies-list">
                    {replies.map((reply) => (
                        <div key={reply.id} className="reply-item">
                            <div className="reply-header">
                                <span className="reply-sender">{reply.replySenderName}</span>
                            </div>
                            <div className="reply-content">{reply.replyMessageContent}</div>
                            <button
                                className="reply-action-btn"
                                onClick={() => onReplySelect && onReplySelect(reply.replyMessageId)}
                            >
                                Відповісти
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}