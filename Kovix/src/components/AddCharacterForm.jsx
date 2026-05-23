import { useState } from 'react';
import { API_BASE_URL } from '../utils/apiConfig';

const ImportMalCharacters = ({ movieId, onImportSuccess }) => {
    const [malAnimeId, setMalAnimeId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleImport = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/movies/${movieId}/import-mal/${malAnimeId}`, {
                method: 'POST'
            });

            if (response.ok) {
                setMessage('✅ Дані успішно імпортовано!');
                setMalAnimeId('');
                if (onImportSuccess) onImportSuccess(); 
            } else {
                setMessage('❌ Помилка імпорту. Перевірте ID.');
            }
        } catch {
            setMessage('❌ Помилка мережі.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '400px', padding: '20px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <h3>Імпорт з MyAnimeList</h3>
            <p style={{ fontSize: '12px', color: '#666' }}>Введіть ID аніме (наприклад, 40748 для Jujutsu Kaisen)</p>
            
            <form onSubmit={handleImport} style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <input 
                    type="number" 
                    value={malAnimeId} 
                    onChange={(e) => setMalAnimeId(e.target.value)} 
                    placeholder="MAL ID..."
                    required 
                    style={{ flex: 1, padding: '8px' }}
                />
                <button 
                    type="submit" 
                    disabled={isLoading}
                    style={{ padding: '8px 15px', backgroundColor: isLoading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {isLoading ? 'Завантаження...' : 'Імпортувати'}
                </button>
            </form>

            {message && <p style={{ marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>{message}</p>}
        </div>
    );
};

export default ImportMalCharacters;