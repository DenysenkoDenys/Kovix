import { useState, useEffect } from 'react';
import '../style/AchievementNotification.css';

function AchievementNotification({ achievement, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="achievement-notification" role="alert" aria-live="polite">
      <div className="achievement-content">
        <div className="achievement-icon">{achievement.icon}</div>
        <div className="achievement-text">
          <div className="achievement-title">🎉 Нове досягнення!</div>
          <div className="achievement-name">{achievement.name}</div>
          {achievement.description && (
            <div className="achievement-desc">{achievement.description}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AchievementNotification;