import { createContext, useContext, useState, useCallback } from 'react';
import AchievementNotification from '../components/AchievementNotification';

const AchievementContext = createContext();

export const AchievementProvider = ({ children }) => {
  const [achievements, setAchievements] = useState([]);

  const showAchievement = useCallback((achievement) => {
    const id = Date.now();
    setAchievements(prev => [...prev, { ...achievement, id }]);
  }, []);

  const hideAchievement = useCallback((id) => {
    setAchievements(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <AchievementContext.Provider value={{ showAchievement }}>
      {children}
      <div className="achievements-container">
        {achievements.map(achievement => (
          <AchievementNotification
            key={achievement.id}
            achievement={achievement}
            onClose={() => hideAchievement(achievement.id)}
          />
        ))}
      </div>
    </AchievementContext.Provider>
  );
};

export const useAchievement = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    console.warn('useAchievement must be used within AchievementProvider');
  }
  return context;
};