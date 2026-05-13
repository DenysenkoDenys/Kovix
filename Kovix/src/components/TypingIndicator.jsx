import { useState, useEffect } from 'react';
import '../style/TypingIndicator.css';

export default function TypingIndicator({ typingUsers }) {
    if (!typingUsers || typingUsers.length === 0) {
        return null;
    }

    return (
        <div className="typing-indicator-container">
            <div className="typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
            </div>
            <span className="typing-text">
                {typingUsers.length === 1
                    ? `${typingUsers[0]} друкує...`
                    : `${typingUsers.join(', ')} друкують...`}
            </span>
        </div>
    );
}