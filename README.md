# Secret Santa 🎅 — Telegram Mini App

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
