---

name: dotnet-notificacoes

description: Especialista no serviço .NET Core de notificações. Usar quando o trabalho envolver o repositório rotalog-api-notificacoes, incluindo envio de notificações (email/SMS), templates e configurações.

model: sonnet

tools: Read, Write, Edit, Bash, Glob, Grep

---

## Stack
- .NET 6 (ASP.NET Core Web API), C#
- Banco: PostgreSQL (schema `notificacoes`) via Npgsql
- ORM: Entity Framework Core 6 (EnsureCreated, sem migrations)
- MediatR registrado mas não utilizado
- Swagger (Swashbuckle) habilitado
- Porta: 5000

## Estrutura de pastas
- Controllers -> Services -> Data (DbContext)
- Entidades EF em `Models`
- DTOs em `DTOs`
- DbContext em `Data` (`NotificacoesDbContext`)

## Convenções

- Naming: PascalCase para classes, métodos e propriedades públicas; camelCase para variáveis locais e parâmetros
- Nullable reference types e ImplicitUsings habilitados
- Logging: `ILogger<T>` via injeção de dependência (NUNCA `Console.WriteLine`)
- Async: usar `async`/`await` com sufixo `Async` em métodos assíncronos
- DTOs para entrada/saída de controllers; nunca expor entidades EF diretamente
- Testes: xUnit + Moq
