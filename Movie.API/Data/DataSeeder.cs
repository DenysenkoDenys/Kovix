using Bogus;
using Movie.API.Models;

namespace Movie.API.Data
{
    public static class DataSeeder
    {
        public static void SeedNews(ApplicationDbContext context)
        {
            int currentCount = context.News.Count();
            if (currentCount >= 10) return;
            int newsToGenerate = 10 - currentCount;

            var newsTemplates = new[]
            {
                new {
                    Title = "🎬 Масштабне оновлення: Розділ Аніме",
                    Content = "На численні прохання нашої спільноти ми нарешті додали повноцінний розділ Аніме!\nТепер ви можете шукати, оцінювати та писати відгуки на улюблені тайтли. База налічує понад 5000 серіалів та фільмів і буде постійно поповнюватись.",
                    Category = "Анонс"
                },
                new {
                    Title = "🛠 Технічні роботи на сервері",
                    Content = "Шановні користувачі!\nЦієї неділі з 23:00 до 01:00 на сайті будуть проводитись планові технічні роботи для покращення швидкості завантаження сторінок.\n\nУ цей час можливі тимчасові перебої в роботі сайту. Дякуємо за розуміння!",
                    Category = "Платформа"
                },
                new {
                    Title = "🏆 Топ-10 найочікуваніших фільмів літа",
                    Content = "Літо обіцяє бути гарячим на кінопрем'єри! Ми зібрали для вас добірку з 10 фільмів, які ви просто не маєте права пропустити.\nШукайте спеціальну підбірку на головній сторінці та додавайте фільми до свого списку «Хочу подивитися».",
                    Category = "Кіно"
                },
                new {
                    Title = "❗ Зміни в правилах сайту: Спойлери",
                    Content = "Спільното, зверніть увагу!\nВідсьогодні ми посилюємо модерацію щодо спойлерів у відгуках. Якщо ви розкриваєте важливі сюжетні повороти, обов'язково використовуйте спеціальний тег приховання тексту.\n\nПорушники отримуватимуть попередження, а при повторному порушенні — блокування коментарів.",
                    Category = "Спільнота"
                },
                new {
                    Title = "✨ Помилку із завантаженням аватарок виправлено",
                    Content = "Ми знаємо, як вас дратувала помилка при спробі змінити фото профілю останні кілька днів.\nГарна новина: наш технічний відділ усе полагодив! Тепер завантаження форматів .avif, .webp, .png та .jpg працює швидко та безперебійно.",
                    Category = "Оновлення"
                },
                new {
                    Title = "🎭 Шукаємо нових Модераторів!",
                    Content = "Платформа Kovix росте, і нам потрібна ваша допомога!\nЯкщо ви любите кіно, маєте багато вільного часу та хочете допомагати підтримувати порядок на сайті — подавайте заявку на роль Модератора через форму зворотного зв'язку.",
                    Category = "Спільнота"
                },
                new {
                    Title = "🌟 Новий VIP статус вже доступний",
                    Content = "Підтримайте розвиток проєкту та отримайте ексклюзивні можливості!\nЗ VIP статусом ви отримуєте спеціальний бейдж біля імені, відсутність реклами та пріоритетну підтримку. Деталі шукайте на сторінці підписок.",
                    Category = "Анонс"
                },
                new {
                    Title = "🍿 Додано підтримку трейлерів YouTube",
                    Content = "Тепер на сторінці кожного фільму ви можете переглянути його офіційний трейлер прямо в нашому вбудованому плеєрі, не переходячи на інші сайти.\nПриємного перегляду!",
                    Category = "Оновлення"
                }
            };

            var faker = new Faker<NewsItem>("uk")
                .CustomInstantiator(f =>
                {
                    var template = f.PickRandom(newsTemplates);

                    return new NewsItem
                    {
                        Title = template.Title,
                        Content = template.Content,
                        Category = template.Category,
                        CreatedAt = f.Date.Recent(60),
                        IsPinned = f.Random.Bool(0.15f)
                    };
                });

            var fakeNews = faker.Generate(newsToGenerate);

            context.News.AddRange(fakeNews);
            context.SaveChanges();
        }

        public static void SeedAdmin(ApplicationDbContext context)
        {
            if (!context.Users.Any(u => u.Email == "admin@gmail.com"))
            {
                context.Users.Add(new User
                {
                    Username = "admin",
                    Email = "admin@gmail.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin"),
                    Role = "Admin",
                    CreatedAt = DateTime.UtcNow
                });
                context.SaveChanges();
            }
        }
    }
}