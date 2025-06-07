# Services

This folder contains business logic and data processing services.
Services handle complex operations, data validation, and interact with models/database through Prisma.
Controllers call services to perform business operations while keeping controllers thin and focused.
Services should be reusable, testable, and contain the core application logic separate from HTTP concerns.
