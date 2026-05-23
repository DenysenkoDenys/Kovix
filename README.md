# 🎬 Kovix — Платформа для рецензування та пошуку фільмів

[![Pipeline Status](https://git.ztu.edu.ua/@ipz224_ddo/kovix/badges/main/pipeline.svg)](https://git.ztu.edu.ua/@ipz224_ddo/kovix/-/pipelines)
[![Coverage](https://git.ztu.edu.ua/@ipz224_ddo/kovix/badges/main/coverage.svg)](https://git.ztu.edu.ua/@ipz224_ddo/kovix/-/jobs)


## 📝 Опис проєкту
**Kovix** — це сучасний Full-Stack веб-застосунок для кіноманів. Платформа дозволяє користувачам знаходити інформацію про фільми, переглядати трейлери, залишати власні рецензії, а також спілкуватися з друзями та отримувати сповіщення в режимі реального часу.

## 🛠 Технологічний стек

- **Мова програмування:** C#
- **Серверна платформа:** ASP.NET Core Web API
- **Робота з даними:** Microsoft SQL Server 2022 та Entity Framework Core
- **Реальний час:** SignalR (WebSockets)
- **Авторизація:** JWT (JSON Web Tokens)
- **Клієнтська частина:** React 18, Vite, Axios, React Router DOM
- **Контейнеризація та розгортання:** Docker, Docker Compose, Nginx
- **CI/CD:** GitHub Actions

**Backend:**
- **Фреймворк:** .NET 8.0 (ASP.NET Core Web API)
- **База даних:** Microsoft SQL Server 2022
- **ORM:** Entity Framework Core
- **Real-time зв'язок:** SignalR (WebSockets)
- **Аутентифікація:** JWT (JSON Web Tokens)

**Frontend:**
- **Бібліотека:** React 18
- **Збірка:** Vite
- **HTTP клієнт:** Axios
- **Роутинг:** React Router DOM

**Інфраструктура & DevOps:**
- **Контейнеризація:** Docker, Docker Compose
- **Веб-сервер:** Nginx
- **CI/CD:** GitHub Actions

## 🚀 Швидкий старт (Локальний запуск)

Проєкт повністю контейнеризований. Для запуску вам потрібен лише встановлений **Docker** та **Docker Desktop**.

**1. Клонування репозиторію:**
```bash
git clone [https://git.ztu.edu.ua/@ipz224_ddo/kovix.git](https://git.ztu.edu.ua/@ipz224_ddo/kovix.git)
cd kovix
```

## 🚀 Free deployment setup

Recommended split for this repo:
- Frontend: Netlify
- Backend: Oracle Cloud Always Free VM with Docker Compose

### Backend hosting
Use `docker-compose.backend.yml` on the VM. It runs the API plus SQL Server in one stack.

### GitHub Actions
The workflow in `.github/workflows/deploy.yml`:
- updates the VM with the latest `main` branch
- starts the backend stack with Docker Compose
- optionally triggers a Netlify rebuild through a build hook

### Required secrets
Set these in GitHub repo secrets:
- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`
- `MSSQL_SA_PASSWORD`
- `NETLIFY_BUILD_HOOK_URL` if you want the frontend rebuild to be triggered from GitHub Actions

### Frontend API URL
In Netlify, set `VITE_API_BASE_URL` to the public HTTPS URL of the backend once the VM endpoint is ready.