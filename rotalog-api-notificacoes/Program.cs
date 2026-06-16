/**
 * RotaLog - API Notificações
 * Notification microservice (.NET Core 6)
 * 
 * Legacy codebase with Clean Architecture abandoned in the middle
 * MediatR configured but not used, god class service
 * Intentional technical debt for Alura course
 */

using Microsoft.EntityFrameworkCore;
using api_notificacoes.Data;
using api_notificacoes.Services;
using api_notificacoes.Middleware;
using api_notificacoes.Logging;
using MediatR;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole(o => o.FormatterName = CorrelationJsonConsoleFormatter.FormatterName);
builder.Logging.AddConsoleFormatter<CorrelationJsonConsoleFormatter, Microsoft.Extensions.Logging.Console.ConsoleFormatterOptions>();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "RotaLog - API Notificações",
        Version = "v1",
        Description = "Microsserviço de notificações do sistema RotaLog"
    });
});

// Database
builder.Services.AddDbContext<NotificacoesDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions => npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "notificacoes")
    ));

// FIXME: MediatR registrado mas não utilizado (Clean Architecture abandonada)
builder.Services.AddMediatR(typeof(Program));

// FIXME: Registrando classe concreta em vez de interface
builder.Services.AddScoped<NotificacaoService>();

// FIXME: CORS permite tudo
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// TODO: Add proper authentication
// TODO: Add rate limiting
// TODO: Add health checks via IHealthCheck
// TODO: Add Serilog for structured logging
// TODO: Add Polly for resilience

var app = builder.Build();

// Configure the HTTP request pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "API Notificações v1");
    c.RoutePrefix = "swagger";
});

// FIXME: CORS antes de auth (ordem correta, mas permite tudo)
app.UseCors();

// FIXME: Sem HTTPS em desenvolvimento
// app.UseHttpsRedirection();

app.UseAuthorization(); // FIXME: Sem autenticação configurada

app.UseMiddleware<CorrelationIdMiddleware>();
app.MapControllers();

// FIXME: Ensure database is created on startup (deveria usar migrations)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<NotificacoesDbContext>();
    try
    {
        // FIXME: EnsureCreated em vez de migrations
        context.Database.EnsureCreated();
        Console.WriteLine("Database connection verified");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Warning: Could not connect to database: {ex.Message}");
        // FIXME: Continua rodando mesmo sem banco
    }
}

Console.WriteLine("=================================");
Console.WriteLine("  API Notificações running on port 5000");
Console.WriteLine($"  Environment: {app.Environment.EnvironmentName}");
Console.WriteLine("  Swagger: http://localhost:5000/swagger");
Console.WriteLine("=================================");
Console.WriteLine();
Console.WriteLine("Endpoints disponíveis:");
Console.WriteLine("  GET    /api/health");
Console.WriteLine("  GET    /api/notificacoes");
Console.WriteLine("  GET    /api/notificacoes/{id}");
Console.WriteLine("  POST   /api/notificacoes");
Console.WriteLine("  POST   /api/notificacoes/{id}/reenviar");
Console.WriteLine("  GET    /api/notificacoes/stats");
Console.WriteLine("  GET    /api/notificacoes/templates");
Console.WriteLine("  POST   /api/notificacoes/processar");
Console.WriteLine();

app.Run();
