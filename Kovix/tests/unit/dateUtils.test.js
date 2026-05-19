import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatLastSeen } from '../../src/utils/dateUtils';

describe('dateUtils - formatLastSeen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Online status', () => {
    it('should return "У мережі" when user is online', () => {
      const result = formatLastSeen('2024-01-01T10:00:00', true);
      expect(result).toBe('У мережі');
    });

    it('should return "У мережі" when isOnline is true regardless of lastActiveDate', () => {
      const result = formatLastSeen(null, true);
      expect(result).toBe('У мережі');
    });
  });

  describe('Offline status without lastActiveDate', () => {
    it('should return "Офлайн" when there is no lastActiveDate', () => {
      const result = formatLastSeen(null, false);
      expect(result).toBe('Офлайн');
    });

    it('should return "Офлайн" when lastActiveDate is empty string', () => {
      const result = formatLastSeen('', false);
      expect(result).toBe('Офлайн');
    });
  });

  describe('Recently offline (less than 1 minute ago)', () => {
    it('should return "Був(ла) щойно" when user was online less than 1 minute ago', () => {
      const now = new Date();
      const oneSecondAgo = new Date(now.getTime() - 1000); 
      const result = formatLastSeen(oneSecondAgo.toISOString(), false);
      expect(result).toBe('Був(ла) щойно');
    });

    it('should return "Був(ла) щойно" when date string does not end with Z (automatically adds it)', () => {
      const now = new Date();
      const thirtySecondsAgo = new Date(now.getTime() - 30000);
      let dateStr = thirtySecondsAgo.toISOString();
      dateStr = dateStr.endsWith('Z') ? dateStr.slice(0, -1) : dateStr; 
      const result = formatLastSeen(dateStr, false);
      expect(result).toBe('Був(ла) щойно');
    });

    it('should handle negative time differences (future dates) as "Був(ла) щойно"', () => {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 3600000);
      const result = formatLastSeen(oneHourLater.toISOString(), false);
      expect(result).toBe('Був(ла) щойно');
    });
  });

  describe('Minutes ago', () => {
    it('should return "Востаннє в мережі X хв. тому" when user was offline less than 1 hour ago', () => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const result = formatLastSeen(thirtyMinutesAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 30 хв. тому');
    });

    it('should return correct minute count', () => {
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const result = formatLastSeen(tenMinutesAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 10 хв. тому');
    });

    it('should return "Востаннє в мережі 1 хв. тому" for 1 minute', () => {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const result = formatLastSeen(oneMinuteAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 1 хв. тому');
    });
  });

  describe('Hours ago', () => {
    it('should return "Востаннє в мережі X год. тому" when user was offline less than 24 hours ago', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const result = formatLastSeen(twoHoursAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 2 год. тому');
    });

    it('should return correct hour count', () => {
      const now = new Date();
      const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000);
      const result = formatLastSeen(tenHoursAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 10 год. тому');
    });

    it('should return "Востаннє в мережі 1 год. тому" for 1 hour', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const result = formatLastSeen(oneHourAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 1 год. тому');
    });
  });

  describe('Days ago', () => {
    it('should return "Востаннє в мережі вчора" when user was offline exactly 1 day ago', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const result = formatLastSeen(yesterday.toISOString(), false);
      expect(result).toBe('Востаннє в мережі вчора');
    });

    it('should return "Востаннє в мережі X дн. тому" for multiple days', () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const result = formatLastSeen(fiveDaysAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 5 дн. тому');
    });

    it('should return "Востаннє в мережі 2 дн. тому" for 2 days', () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const result = formatLastSeen(twoDaysAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 2 дн. тому');
    });

    it('should handle dates far in the past', () => {
      const now = new Date();
      const longTimeAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000);
      const result = formatLastSeen(longTimeAgo.toISOString(), false);
      expect(result).toBe('Востаннє в мережі 100 дн. тому');
    });
  });

  describe('Edge cases', () => {
    it('should handle invalid date strings gracefully', () => {
      const result = formatLastSeen('invalid-date', false);
      expect(result).toContain('дн. тому');
    });

    it('should handle timestamps with and without Z suffix', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const isoString = fiveMinutesAgo.toISOString();
      
      const resultWithZ = formatLastSeen(isoString, false);
      const resultWithoutZ = formatLastSeen(isoString.slice(0, -1), false);
      
      expect(resultWithZ).toBe(resultWithoutZ);
      expect(resultWithZ).toBe('Востаннє в мережі 5 хв. тому');
    });

    it('should be consistent with multiple calls', () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const dateStr = twoHoursAgo.toISOString();
      
      const result1 = formatLastSeen(dateStr, false);
      const result2 = formatLastSeen(dateStr, false);
      
      expect(result1).toBe(result2);
    });
  });

  describe('Boundary tests', () => {
    it('should transition from minutes to hours correctly', () => {
      const now = new Date();
      const justBefore60Minutes = new Date(now.getTime() - 59 * 60 * 1000);
      const justAfter60Minutes = new Date(now.getTime() - 61 * 60 * 1000);
      
      const resultBefore = formatLastSeen(justBefore60Minutes.toISOString(), false);
      const resultAfter = formatLastSeen(justAfter60Minutes.toISOString(), false);
      
      expect(resultBefore).toContain('хв. тому');
      expect(resultAfter).toContain('год. тому');
    });

    it('should transition from hours to days correctly', () => {
      const now = new Date();
      const justBefore24Hours = new Date(now.getTime() - 23 * 60 * 60 * 1000);
      const justAfter24Hours = new Date(now.getTime() - 25 * 60 * 60 * 1000);
      
      const resultBefore = formatLastSeen(justBefore24Hours.toISOString(), false);
      const resultAfter = formatLastSeen(justAfter24Hours.toISOString(), false);
      
      expect(resultBefore).toContain('год. тому');
      expect(resultAfter).toMatch(/(вчора|дн\. тому)/);
    });
  });
});
