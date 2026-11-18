using Microsoft.EntityFrameworkCore;
using SecretSanta.Data;
using SecretSanta.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Налаштування бази даних SQL Server
string connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=(localdb)\\mssqllocaldb;Database=SecretSantaDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

builder.Services.AddDbContext<SecretSantaDbContext>(options =>
    options.UseSqlServer(connectionString));

// 2. Сервіси додатку
builder.Services.AddHttpClient();
builder.Services.AddScoped<ISecretSantaAlgorithm, SecretSantaAlgorithm>();
builder.Services.AddScoped<ITelegramService, TelegramService>();

// CORS для локальної розробки та Vite dev-сервера
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

// 3. Автоматичне створення/міграція бази даних при старті
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SecretSantaDbContext>();
    try
    {
        db.Database.EnsureCreated();

        // Перевіряємо, чи база містить застарілі колонки (HostEmail замість HostTelegramId)
        var conn = db.Database.GetDbConnection();
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Rooms' AND COLUMN_NAME = 'HostEmail')
            BEGIN
                DROP TABLE IF EXISTS Assignments;
                DROP TABLE IF EXISTS Restrictions;
                DROP TABLE IF EXISTS Participants;
                DROP TABLE IF EXISTS Rooms;
            END
        ";
        cmd.ExecuteNonQuery();
        conn.Close();

        db.Database.EnsureCreated();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Помилка при створенні/перевірці бази даних.");
    }
}

// У режимі розробки вимикаємо редирект на HTTPS, щоб уникнути CORS-блокувань Vite Proxy
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors();
app.UseStaticFiles();
app.UseRouting();

// Health check endpoints for uptime monitoring and liveness probes (supports GET and HEAD)
app.MapMethods("/health", ["GET", "HEAD"], () => Results.Text("Healthy"));
app.MapMethods("/api/health", ["GET", "HEAD"], () => Results.Text("Healthy"));

app.MapControllers();

// 4. Підтримка SPA: повертаємо index.html для всіх невідомих клієнтських маршрутів
app.MapFallbackToFile("index.html");

app.Run();
