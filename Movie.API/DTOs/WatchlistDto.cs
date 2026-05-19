using Movie.API.Models.Enums;

namespace Movie.API.DTOs
{
    public class WatchlistDto
    {
        public int Status { get; set; }
        public bool IsFavorite { get; set; }
    }
}
