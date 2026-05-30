# Configuration Guide - Port 8080 Setup

## Overview
The project has been configured to use port **8080** for the API backend instead of port 5096.

## Configuration Files

### Frontend (React/Vite)

#### Environment Files Location
- `.env` - Default environment variables
- `.env.local` - Local development overrides (not committed to git)
- `.env.production` - Production environment variables

#### API Configuration
The API base URL is managed in `src/utils/apiConfig.js` and uses the `VITE_API_BASE_URL` environment variable.

```javascript
import { API_BASE_URL } from '../utils/apiConfig';

const response = await fetch(`${API_BASE_URL}/api/endpoint`);
```

### Backend (.NET)

#### Launch Configuration
File: `Movie.API/Properties/launchSettings.json`

The development profile now uses port **8080**:
```json
"applicationUrl": "http://localhost:8080",
"environmentVariables": {
  "ASPNETCORE_URLS": "http://localhost:8080"
}
```

#### Docker Configuration
File: `docker-compose.yml`

The backend service is already configured for port **8080**:
```yaml
backend:
  ports:
    - "8080:8080"
  environment:
    - ASPNETCORE_URLS=http://+:8080
```

## Running Locally

### Option 1: Direct Local Development (без Docker)

#### Frontend
```bash
cd Kovix
npm install
npm run dev
```
Frontend will run on `http://localhost:5173` and connect to API at `http://localhost:8080`

#### Backend
```bash
cd Movie.API
dotnet run
```
API will run on `http://localhost:8080`

**Переваги:** Найшвидший розвиток, легко дебагувати, автоматичний Hot Reload

### Option 2: Docker Compose (Production-like environment)
```bash
docker-compose up
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- Database: `localhost:1433`

**Переваги:** Наближає до production середовища

### Option 3: Development Docker Compose (Рекомендується для розробки)
```bash
docker-compose -f docker-compose.dev.yml up
```
- Frontend: `http://localhost:5173` (Vite dev server з Hot Reload)
- Backend: `http://localhost:8080`
- Database: `localhost:1433`

**Це оптимальний варіант!** 

**Переваги:**
- ✅ Автоматичний Hot Reload при змінах коду (dotnet watch для backend, Vite для frontend)
- ✅ Зміни одразу видно без перезапуску контейнерів
- ✅ Симулює production архітектуру (Docker + база)
- ✅ Не потрібно встановлювати .NET SDK або Node локально
- ✅ Ізольоване середовище (як у CI/CD)

**Як це працює:**
- Backend монтується як volume, `dotnet watch` перестежує зміни і перекомпілює автоматично
- Frontend працює на Vite dev сервері з hot reload
- База даних в окремому контейнері

## Changing the Port

### For Development (React)
Edit `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:YOUR_PORT
```

### For Production (React)
Edit `.env.production`:
```env
VITE_API_BASE_URL=https://your-api-domain.com
```

### For .NET Backend
Edit `launchSettings.json` or set environment variables:
```bash
set ASPNETCORE_URLS=http://localhost:YOUR_PORT
```

## Testing the Connection
Verify the API is accessible at `http://localhost:8080/swagger` (Swagger UI)

## Important Notes
- Never commit `.env.local` to the repository (it's for local development only)
- Frontend components now import `API_BASE_URL` from `apiConfig.js` for centralized management
- All hardcoded `http://localhost:5096` references have been replaced with environment variables

---

## 🐳 Docker Development Workflow (RECOMMENDED)

### Quick Start
```bash
# Запустити все в Docker з auto-reload
docker-compose -f docker-compose.dev.yml up

# Зупинити
docker-compose -f docker-compose.dev.yml down

# Пересобрати образи при змінах dependencies
docker-compose -f docker-compose.dev.yml up --build
```

### Корисні команди

#### Переглянути логи
```bash
# Всі сервіси
docker-compose -f docker-compose.dev.yml logs -f

# Тільки backend
docker-compose -f docker-compose.dev.yml logs -f backend_dev

# Тільки frontend
docker-compose -f docker-compose.dev.yml logs -f frontend_dev

# Тільки база даних
docker-compose -f docker-compose.dev.yml logs -f db
```

#### Виконати команду в контейнері
```bash
# Запустити dotnet migration
docker-compose -f docker-compose.dev.yml exec backend_dev dotnet ef migrations add MigrationName

# Запустити npm команду у frontend
docker-compose -f docker-compose.dev.yml exec frontend_dev npm install package-name
```

#### Очистити всі контейнери та об'єми
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### 🔧 Troubleshooting

**Проблема:** Backend контейнер не запускається або часто перезавантажується
- **Розв'язання:** Перевірити логи: `docker-compose -f docker-compose.dev.yml logs backend_dev`
- Можливо потрібна нова база даних: `docker-compose -f docker-compose.dev.yml down -v`

**Проблема:** Зміни у коді не відбиваються в контейнері
- **Розв'язання:** 
  - Backend використовує `dotnet watch` – зміни повинні застосуватися за 2-5 секунд
  - Frontend використовує Vite – зміни застосовуються одразу
  - Якщо не працює, перезапустіть: `docker-compose -f docker-compose.dev.yml restart backend_dev`

**Проблема:** Port вже використовується
```bash
# Змінити порт в docker-compose.dev.yml:
# ports:
#   - "8080:8080"  # змініть перше число на інший порт, напр. 8081
```

**Проблема:** База даних не підключається
- Переконайтеся, що контейнер `mssql_kovix_dev` запущений: `docker ps`
- Перевірити логи БД: `docker-compose -f docker-compose.dev.yml logs db`
- Зачекайте 30 секунд для ініціалізації БД після першого запуску

---

## 📝 File Structure

**Нові файли для розробки:**
- `docker-compose.dev.yml` – Development compose з auto-reload
- `Movie.API/Dockerfile.dev` – Development Dockerfile для backend
- `Kovix/Dockerfile.dev` – Development Dockerfile для frontend

**Production файли (використовуйте для deploy):**
- `docker-compose.yml` – Production compose
- `Movie.API/Dockerfile` – Production Dockerfile для backend
- `Kovix/Dockerfile` – Production Dockerfile для frontend
