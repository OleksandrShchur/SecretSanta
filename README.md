# Secret Santa 🎅 — Telegram Mini App

[![Build](.github/badges/build.svg)](https://github.com/OleksandrShchur/SecretSanta/actions/workflows/build-and-test.yml)
[![Coverage](.github/badges/coverage.svg)](https://github.com/OleksandrShchur/SecretSanta/actions/workflows/build-and-test.yml)
[![Tests](https://img.shields.io/badge/tests-109%20passed-brightgreen.svg)](https://github.com/OleksandrShchur/SecretSanta/actions/workflows/build-and-test.yml)
[![.NET](https://img.shields.io/badge/.NET-10.0-512BD4.svg?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev/)

Повноцінний сучасний застосунок для організації та проведення новорічного розіграшу **«Таємний Санта»** у форматі **Telegram Mini App (TMA)** без використання email:
- **Бекенд**: **.NET 10 (ASP.NET Core Web API)**
- **База даних**: **SQL Server** (LocalDB для локальної розробки, MonsterASP MSSQL для хостингу)
- **Фронтенд**: **React + TypeScript + Vite + Telegram WebApp SDK** із компонентами та іконками **Lucide**
- **Сповіщення**: **Telegram Bot API** (персональні святкові повідомлення кожному учаснику)

---

## 🌟 Можливості

1. **Telegram Mini App (TMA) інтеграція**:
   - Автоматичний вхід через Telegram: ім'я, прізвище, `@username` та Telegram ID автоматично визначаються через `Telegram.WebApp.initData`.
   - Запрошення за посиланням `t.me/<bot_username>/app?startapp=<roomId>`: при переході з чату/каналу Telegram одразу відкриває потрібну кімнату.
   - Підтримка вібровідгуку (Haptic Feedback) на мобільних пристроях при діях користувача.
   - Вбудований локальний перемикач тестових профілів Telegram для зручної розробки у звичайному браузері без запуску клієнта Telegram.

2. **Організатор (Хост)**:
   - Створює кімнату в Telegram в один клік, за бажанням додаючи власні побажання до подарунка.
   - Отримує адмін-посилання (`?room=<id>&admin=<token>`) для керування кімнатою.
   - Бачить зареєстрованих учасників з їхніми Telegram-тегами (`@username`).
   - Налаштовує матрицю обмежень (хто кому не може дарувати).
   - Запускає жеребкування однією кнопкою після збору мінімум 3 учасників.

3. **Отримання результатів жеребкування**:
   - 🤖 **В особисті повідомлення від Telegram-бота**: кожен учасник миттєво отримує приватне святкове повідомлення з ім'ям, `@username` та побажаннями свого підопічного.
   - 🎁 **В інтерфейсі Mini App**: учасник може будь-коли відкрити додаток і переглянути свого підопічного на інтерактивній секретній картці з функцією розкриття та приховування від сторонніх очей.

4. **Два режими роботи**:
   - 🏠 **Кімната в Telegram**: повноцінний онлайн-розподіл зі сповіщеннями від бота.
   - 🎲 **Швидке жеребкування на місці (Офлайн)**: локальний розподіл прямо на екрані без збереження на сервері.

---

## 🚀 Запуск проєкту локально

### Вимоги:
- [.NET 10 SDK](https://dotnet.microsoft.com/)
- [Node.js](https://nodejs.org/) (версія 18+)
- SQL Server LocalDB (входить до складу Visual Studio, або `sqllocaldb start MSSQLLocalDB`)

### Запуск однією командою:
У кореневій директорії проєкту виконайте:

```bash
dotnet run
```

> **Що відбувається автоматично:**
> 1. Запускається .NET 10 сервер (за замовчуванням на `http://localhost:5080` та `https://localhost:7080`).
> 2. Entity Framework Core автоматично створює та перевіряє базу даних `SecretSantaDb` у LocalDB.
> 3. `Microsoft.AspNetCore.SpaProxy` автоматично запускає React Vite dev-сервер (`http://localhost:5173`) та відкриває браузер.
> 4. У браузері в шапці додатку активний «Тестовий режим Telegram», який дозволяє перемикати користувачів (`@alex_shchur`, `@maria_k`, `@ivan_p` тощо) для симуляції кімнати з кількома людьми.

---

## ⚙️ Налаштування Telegram Bot у `appsettings.json`

Файл `appsettings.json`:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=SecretSantaDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
  },
  "Telegram": {
    "BotToken": "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ",
    "BotUsername": "MySecretSantaBot",
    "WebAppUrl": "https://your-domain.com"
  }
}
```

> **Як створити Telegram-бота за 1 хвилину:**
> 1. Відкрийте [@BotFather](https://t.me/BotFather) у Telegram і напишіть команду `/newbot`.
> 2. Вкажіть назву та username бота (наприклад, `BestSecretSantaBot`). Скопіюйте отриманий токен у поле `BotToken`.
> 3. Вкажіть username бота (без `@`) у полі `BotUsername`.
> 4. У @BotFather викличте `/newapp`, виберіть вашого бота, завантажте назву та вкажіть URL вашого сайту (`WebAppUrl`), щоб користувачі могли відкривати додаток прямо з Telegram через `t.me/<BotUsername>/app?startapp=<roomId>`.
>
> *Якщо `Telegram:BotToken` не вказано, застосунок автоматично працює в безпечному демо-режимі (імітація надсилання сповіщень із логуванням у консоль бекенду).*

---

## 📦 Розгортання на MonsterASP (Free Plan)

1. **Збірка публікації**:
   ```bash
   dotnet publish -c Release -o publish
   ```
   *MSBuild автоматично збере React додаток (`npm run build`) і скопіює готові файли в папку `wwwroot/`.*

2. **Налаштування бази даних у панелі MonsterASP**:
   - Створіть безкоштовну базу даних MS SQL у панелі керування MonsterASP.
   - Скопіюйте Connection String із панелі MonsterASP у `publish/appsettings.json`:
     ```json
     "DefaultConnection": "Server=tcp:your_monster_server,1433;Database=your_db;User ID=your_user;Password=your_password;TrustServerCertificate=True"
     ```

3. **Завантаження на хостинг**:
   - Завантажте вміст папки `publish/` до кореневої папки вашого сайту на MonsterASP через FTP або File Manager.
   - Налаштуйте `WebAppUrl` у `appsettings.json` на вашу MonsterASP адресу (з `https://`).
   - Готово! Додаток працює як надійний Telegram Mini App.

4. **Моніторинг та Health Check**:
   - Ендпоінт: `/health` (або `/api/health`).
   - Підтримує HTTP-методи **GET** та **HEAD**, повертає `200 OK` зі статусом `Healthy`.
   - Ідеально для сервісів моніторингу аптайму (UptimeRobot, Better Stack тощо), щоб підтримувати роботу інстансу.

---

## 🧪 Тестування (Testing)

Проєкт повністю покритий автоматичними тестами всіх рівнів:

### 1. Бекенд-тести (.NET 10 xUnit + FluentAssertions + Moq)
```bash
# Запуск усіх бекенд тестів (Unit + Integration)
dotnet test

# Тільки модульні тести
dotnet test SecretSanta.UnitTests

# Тільки інтеграційні тести API
dotnet test SecretSanta.IntegrationTests
```
- **[SecretSanta.UnitTests](file:///c:/Users/osur1/Documents/personal/IT/pet_projects/SecretSanta/SecretSanta.UnitTests)** (58 тестів):
  - `SecretSantaAlgorithmTests`: валідація графу та випадкових гамільтонових циклів жеребкування, перевірка циклічності, обробка мінімуму учасників (<3), взаємні обмеження, перевірка неможливих конфігурацій з локалізованими повідомленнями про помилки.
  - `TelegramServiceTests`: криптографічна валідація HMAC-SHA256 підпису `initData` від Telegram WebApp, надсилання сповіщень, форматування HTML-розмітки, обробка побажань та помилок мережі.
  - `RoomsControllerUnitTests` & `TelegramControllerUnitTests`: бізнес-логіка створення, керування, жеребкування, перегляду призначень та вебхуків.
- **[SecretSanta.IntegrationTests](file:///c:/Users/osur1/Documents/personal/IT/pet_projects/SecretSanta/SecretSanta.IntegrationTests)** (10 тестів):
  - Повний наскрізний життєвий цикл кімнати через `WebApplicationFactory<Program>` та InMemory DB: Створення -> Приєднання учасників -> Обмеження -> Жеребкування -> Отримання підопічного -> Деактивація -> Видалення.
  - Тестування авторизації через токени адміністратора, вебхуків та `/health` проб.

### 2. UI-тести фронтенду (React 19 + Vitest + React Testing Library)
```bash
# Запуск усіх UI тестів
npm --prefix ClientApp test
```
- **[ClientApp UI Tests](file:///c:/Users/osur1/Documents/personal/IT/pet_projects/SecretSanta/ClientApp/src/components/__tests__)** (41 тест):
  - `OfflineGenerator.test.tsx`: додавання/видалення учасників, валідація дублікатів і порожніх полів, блокування жеребкування при < 3 учасниках, генерація пар, матриця обмежень, копіювання в буфер обміну.
  - `CreateRoom.test.tsx`: валідація полів кімнати, Telegram defaults, перемикач участі хоста, відправка форми та обробка помилок.
  - `JoinRoom.test.tsx`: перегляд публічних даних, приєднання нових учасників, статус зареєстрованого учасника з можливістю редагування, відображення результату після жеребкування.
  - `HostDashboard.test.tsx`: статистика, список учасників, копіювання посилання запрошення, матриця обмежень, запуск жеребкування.
  - `MyAssignmentCard.test.tsx`: інтерактивна секретна картка (приховано/розкрито), безпека від сторонніх очей, відображення побажань.
  - `MyRooms.test.tsx`: навігація між кімнатами організатора та учасника.
  - `NavbarAndHeader.test.tsx` & `App.test.tsx`: маршрутизація за URL-параметрами (`?room=`, `?admin=`, `?view=my-rooms`, `?tab=offline`), перемикання вкладок.

### 3. Автоматичний CI та покриття коду (Code Coverage & CI)
- **Загальне покриття бекенду**: **92.1%** (Line coverage), **79.7%** (Branch coverage), **95%** (Method coverage).
- Покриття вимірюється автоматично за допомогою **Coverlet** та **ReportGenerator** у GitHub Actions workflow ([.github/workflows/build-and-test.yml](file:///c:/Users/osur1/Documents/personal/IT/pet_projects/SecretSanta/.github/workflows/build-and-test.yml)).
- Бейдж покриття у шапці репозиторію оновлюється автоматично під час збірки в гілці `master`.
- Локальна генерація детального HTML-звіту покриття:
  ```bash
  # 1. Запуск тестів зі збором покриття
  dotnet test --collect:"XPlat Code Coverage"

  # 2. Встановлення ReportGenerator (одноразово)
  dotnet tool install -g dotnet-reportgenerator-globaltool

  # 3. Генерація звіту та бейджів
  reportgenerator -reports:"**/coverage.cobertura.xml" -targetdir:"coveragereport" -reporttypes:"Html;Badges" -classfilters:"-Microsoft.AspNetCore.OpenApi.*;-System.Runtime.*"
  ```

