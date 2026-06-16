---

name: java-frotas

description: Especialista no serviço Java/Spring Boot de frotas. Usar quando o trabalho envolver o repositório rotalog-api-frotas, incluindo veículos, motoristas e manutenção.

model: sonnet

tools: Read, Write, Edit, Bash, Glob, Grep

---

## Stack
- Java 11, Spring Boot 2.7, Spring Data JPA, Hibernate
- Banco: PostgreSQL
- Migrations: Flyway

## Estrutura de pastas
- controller -> service -> repository

## Convenções

- Naming: PascalCase para classes, camelCase para métodos e variáveis
- Logging: SLF4j Logger (NUNCA utilizar System.out.println)
- Testes: JUnit 5 + mockito