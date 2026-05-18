import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'preferredPlayer';

export default function PlayerSelector({ value, onChange }) {
  const [selected, setSelected] = useState(value || localStorage.getItem(STORAGE_KEY) || 'default');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selected);
    if (onChange) onChange(selected);
  }, [selected]);

  return (
    <div className="d-flex align-items-center gap-2">
      <label className="mb-0 small text-muted">Плеєр:</label>
      <select className="form-select form-select-sm" style={{ maxWidth: '220px' }} value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="default">Вбудований (за замовчуванням)</option>
        <option value="custom">Кастомний HTML5 / YouTube</option>
      </select>
    </div>
  );
}