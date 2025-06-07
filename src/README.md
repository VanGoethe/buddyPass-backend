# BuddyPass Backend - Source Code Structure

This directory contains the source code for the BuddyPass backend application, organized following clean architecture principles with clear separation of concerns.

## Directory Structure

```
src/
├── controllers/{domain}/     # HTTP request handlers
├── services/{domain}/        # Business logic layer
├── repositories/{domain}/    # Data access layer
├── models/{domain}/          # Entity definitions
├── types/{domain}/           # Interfaces & DTOs
├── middleware/               # Express middleware
├── routes/                   # Route definitions
├── config/                   # Configuration files
├── utils/                    # Utility functions
├── app.ts                    # Express app configuration
├── server.ts                 # Server startup
└── container.ts              # Dependency injection container
```

## Architecture Layers

### Controllers Layer (`controllers/`)

- Handle HTTP requests and responses
- Validate input data using express-validator
- Call appropriate service methods
- Format and return API responses
- Implement proper error handling and HTTP status codes

### Services Layer (`services/`)

- Contain business logic and orchestration
- Implement use cases and business rules
- Coordinate between multiple repositories when needed
- Handle complex business operations
- Maintain domain-specific logic

### Repositories Layer (`repositories/`)

- Handle data persistence and database operations
- Implement repository interfaces for testability
- Use Prisma ORM for database interactions
- Handle database-specific error handling
- Provide data access abstractions

### Types Layer (`types/`)

- Define TypeScript interfaces and DTOs
- Specify API request/response contracts
- Define domain entity interfaces
- Maintain type safety across the application

### Models Layer (`models/`)

- Define domain entity structures
- Implement domain-specific validation
- Maintain entity business rules
- Provide entity factory methods

## Current Modules

### Authentication Module

- User authentication and authorization
- JWT token management
- OAuth integration (Google)
- Password hashing and validation

### ServiceProvider Module

- Manage streaming service providers (Netflix, Spotify, etc.)
- CRUD operations for service provider entities
- Service provider metadata management

### Subscription Module

- Manage subscription accounts for service providers
- Track available slots and pricing
- Handle subscription lifecycle management
- Manage subscription metadata and configuration

## Dependency Flow

The application follows a strict dependency flow:

```
Controller → Service → Repository → Database
```

- Controllers never call repositories directly
- Services orchestrate business logic and call repositories
- Repositories handle all database interactions
- All dependencies are injected through the container

## Testing Structure

Each module includes comprehensive test suites covering:

- Unit tests for services (business logic)
- Integration tests for repositories (data access)
- End-to-end tests for controllers (API endpoints)
- Mock implementations for external dependencies

## API Design

All API endpoints follow RESTful conventions:

- `GET /api/{resource}` - List resources with pagination
- `GET /api/{resource}/{id}` - Get single resource
- `POST /api/{resource}` - Create new resource
- `PUT /api/{resource}/{id}` - Update existing resource
- `DELETE /api/{resource}/{id}` - Delete resource

Response format:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

Error format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```
