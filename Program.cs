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
builder.Services.AddScoped<IEmailService, EmailService>();

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
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Помилка при створенні/перевірці бази даних.");
    }
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.MapControllers();

// 4. Підтримка SPA: повертаємо index.html для всіх невідомих клієнтських маршрутів
app.MapFallbackToFile("index.html");

app.Run();
