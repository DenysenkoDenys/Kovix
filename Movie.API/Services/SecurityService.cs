using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;

namespace Movie.API.Services
{
    public class SecurityService
    {
        private readonly IMemoryCache _cache;
        private readonly TimeSpan _failedWindow = TimeSpan.FromMinutes(15);
        private readonly int _maxFailedAttempts = 5;
        private readonly TimeSpan _lockoutTime = TimeSpan.FromMinutes(15);

        public SecurityService(IMemoryCache cache)
        {
            _cache = cache;
        }

        private string FailedKey(string email) => $"failed:{email.ToLowerInvariant()}";
        private string LockoutKey(string email) => $"lockout:{email.ToLowerInvariant()}";

        public bool IsLocked(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            if (_cache.TryGetValue<DateTime>(LockoutKey(email), out var until))
            {
                if (until > DateTime.UtcNow) return true;
                _cache.Remove(LockoutKey(email));
            }
            return false;
        }

        public int GetFailedAttempts(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return 0;
            return _cache.Get<int?>(FailedKey(email)) ?? 0;
        }

        public void RegisterFailedAttempt(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return;
            var key = FailedKey(email);
            var cnt = _cache.Get<int?>(key) ?? 0;
            cnt++;
            _cache.Set(key, cnt, DateTimeOffset.UtcNow.Add(_failedWindow));

            if (cnt >= _maxFailedAttempts)
            {
                _cache.Set(LockoutKey(email), DateTime.UtcNow.Add(_lockoutTime), DateTimeOffset.UtcNow.Add(_lockoutTime));
                _cache.Remove(key);
            }
        }

        public void ResetFailedAttempts(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return;
            _cache.Remove(FailedKey(email));
            _cache.Remove(LockoutKey(email));
        }
    }
}
