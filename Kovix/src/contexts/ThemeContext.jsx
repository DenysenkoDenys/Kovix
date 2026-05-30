import { createContext, useContext, useState, useEffect } from 'react';
import { THEMES as PRESETS } from '../constants/themePresets';

const ThemeContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('appTheme') || 'light';
  });

  const [customThemes, setCustomThemes] = useState(() => {
    const saved = localStorage.getItem('userCustomThemes');
    return saved ? JSON.parse(saved) : {};
  });

  const allThemes = { ...PRESETS, ...customThemes };

  const changeTheme = (themeKey) => {
    setCurrentTheme(themeKey);
    localStorage.setItem('appTheme', themeKey);
  };

  const addCustomTheme = (themeName, colors) => {
    const themeId = `custom_${Date.now()}`;
    const newTheme = {
      name: themeName,
      colors: colors,
      isCustom: true
    };
    const updated = { ...customThemes, [themeId]: newTheme };
    setCustomThemes(updated);
    localStorage.setItem('userCustomThemes', JSON.stringify(updated));
    changeTheme(themeId); 
  };

  const removeCustomTheme = (themeId) => {
    const updated = { ...customThemes };
    delete updated[themeId];
    setCustomThemes(updated);
    localStorage.setItem('userCustomThemes', JSON.stringify(updated));
    if (currentTheme === themeId) changeTheme('light');
  };

  useEffect(() => {
    const themeConfig = allThemes[currentTheme] || allThemes['light'];
    
    for (const [key, value] of Object.entries(themeConfig.colors)) {
      document.documentElement.style.setProperty(key, value);
    }

    const isLightTheme = currentTheme === 'light' || themeConfig.colors['--bg-main'] === '#f8f9fa' || themeConfig.colors['--bg-main'] === '#ffffff';
    document.documentElement.setAttribute('data-bs-theme', isLightTheme ? 'light' : 'dark');

  }, [currentTheme, customThemes]);

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      changeTheme, 
      themeMode: (allThemes[currentTheme] || {}).colors?.['--bg-main'] === '#f8f9fa' ? 'light' : 'dark',
      addCustomTheme, 
      removeCustomTheme, 
      themes: allThemes 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};