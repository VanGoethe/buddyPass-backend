# BuddyPass Backend API

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Jest](https://img.shields.io/badge/-jest-%23C21325?style=for-the-badge&logo=jest&logoColor=white)
![Swagger](https://img.shields.io/badge/-Swagger-%23Clojure?style=for-the-badge&logo=swagger&logoColor=white)

**Enterprise-Grade Subscription Sharing Platform Backend**

_Built with Clean Architecture, Domain-Driven Design, and Production-Ready Security_

</div>

## 🏗️ Architecture Overview

BuddyPass Backend is a sophisticated **Node.js/TypeScript** application designed with **enterprise-grade architecture patterns** and **production-ready security**. The system follows **Clean Architecture** principles with strict layer separation, comprehensive **dependency injection**, and **domain-driven design**.

### Core Architectural Patterns

- **🎯 Clean Architecture**: Strict separation of concerns with Controllers → Services → Repositories → Database
- **🔄 Dependency Injection**: Container-based DI with interface segregation and inversion of control
- **🏛️ Domain-Driven Design**: Rich domain models with business logic encapsulation
- **📊 Repository Pattern**: Abstract data access layer with transaction management
- **🛡️ Security-First Design**: JWT-based authentication, RBAC, and comprehensive input validation
- **📝 OpenAPI-First**: Complete API specification with Swagger documentation
- **🧪 Test-Driven Development**: Comprehensive test coverage with automated cleanup utilities

## 🚀 Key Features & Capabilities

### 🔐 **Advanced Authentication & Authorization**

- **Multi-Provider Authentication**: Email/password and Google OAuth2 integration with Passport.js
- **JWT Security Architecture**: Access tokens (15min) + Refresh tokens (7 days) with automatic rotation
- **Role-Based Access Control (RBAC)**: Granular permissions with USER/ADMIN roles and self-protection
- **Session Management**: Secure token lifecycle with database-backed refresh token management
- **Centralized Rate Limiting**: Environment-aware progressive rate limiting with configurable thresholds

### 🌍 **Subscription Management Platform**

- **Intelligent Slot Assignment**: Automatic subscription slot allocation with business rule validation
- **Subscription Request System**: Status-tracked requests (PENDING, ASSIGNED, REJECTED, CANCELLED)
- **Multi-Country Support**: ISO 3166-1 compliant country management with service provider restrictions
- **Currency System**: ISO 4217 compliant multi-currency support with decimal precision
- **Complete Lifecycle Management**: Full CRUD operations with expiration tracking and renewal management

### 📊 **Enterprise-Grade Database Design**

- **PostgreSQL with Prisma ORM**: Type-safe database operations with automated migrations
- **Referential Integrity**: Comprehensive foreign key relationships with cascade handling
- **Transaction Management**: ACID compliance with proper error handling and rollback
- **Optimized Schema**: Strategic indexing and constraint design for performance

### 🛡️ **Security & Compliance**

- **Multi-Layer Validation**: express-validator with custom business rule validation
- **Password Security**: Bcrypt hashing with 12+ salt rounds and complexity requirements
- **Security Headers**: Helmet.js integration with CORS configuration
- **Admin Protection**: Built-in safeguards preventing admin self-lockout scenarios

## 📁 Project Architecture

```
src/
├── 🎮 controllers/              # HTTP request handlers (presentation layer)
│   ├── users/                   # User management & authentication endpoints
│   ├── subscriptions/           # Subscription CRUD & slot assignment
│   ├── serviceProviders/        # Service provider management
│   ├── countries/               # Geographic data management
│   ├── currencies/              # Currency management
│   └── admin/                   # Administrative platform management
├── 🏢 services/                 # Business logic orchestration
│   ├── users/                   # User domain services & OAuth handling
│   ├── subscriptions/           # Subscription business rules & slot assignment
│   ├── serviceProviders/        # Provider validation & country restrictions
│   └── countries/               # Geographic data validation
├── 🗄️ repositories/            # Data access layer
│   ├── users/                   # User data persistence & refresh tokens
│   ├── subscriptions/           # Subscription, slot, and request data operations
│   ├── serviceProviders/        # Provider and country relationship management
│   └── countries/               # Geographic and currency data access
├── 🏛️ models/                  # Domain entity definitions
│   ├── users/                   # User domain model with OAuth support
│   ├── subscriptions/           # Subscription entities with slot management
│   └── countries/               # Geographic and currency models
├── 📋 types/                    # TypeScript interfaces & DTOs
│   ├── users/                   # Authentication & user management types
│   ├── subscriptions/           # Subscription management contracts
│   └── common/                  # Shared type definitions
├── 🛠️ middleware/              # Express middleware stack
│   ├── auth.ts                  # JWT authentication & role-based authorization
│   ├── errorHandler.ts          # Centralized error handling with logging
│   └── validation/              # Request validation middleware
├── 🔧 config/                   # Application configuration
│   ├── database.ts              # Prisma client configuration
│   ├── swagger.ts               # Complete OpenAPI specification
│   ├── auth.ts                  # JWT & OAuth configuration
│   ├── passport.ts              # Passport.js strategy configuration
│   └── rateLimiting.ts          # Centralized rate limiting configuration
├── 🧪 utils/                    # Utility functions & helpers
│   ├── validation.ts            # Input validation helpers
│   └── testCleanup.ts           # Automated test data management
└── 📡 routes/                   # API route definitions
    ├── users.ts                 # Authentication & user management routes
    ├── subscriptions.ts         # Subscription management & slot assignment
    ├── serviceProviders.ts      # Provider management routes
    ├── countries.ts             # Geographic data routes
    ├── currencies.ts            # Currency management routes
    └── admin.ts                 # Administrative platform routes

tests/
├── 🧪 unit/                     # Unit tests with comprehensive mocking
├── 🔗 integration/              # Integration tests with test database
├── 🌐 e2e/                     # End-to-end API workflow tests
└── 🛠️ utils/                   # Test utilities with automated cleanup
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **PostgreSQL 13+** with extensions support
- **Google OAuth Credentials** (optional, for OAuth integration)

### Installation & Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd buddypass-backend

# 2. Install dependencies with exact versions
npm ci

# 3. Environment configuration
cp env.example .env
# Edit .env with your configuration (see Environment Variables section)

# 4. Database setup with migrations
npm run migrate
npm run generate

# 5. Create initial admin user
npm run create-admin

# 6. Start development server with hot reload
npm run dev
```

The API will be available at `http://localhost:3000` with interactive documentation at `http://localhost:3000/api-docs`

## 🔧 Environment Variables

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/buddypass_db"

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# JWT Security Configuration
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth Configuration (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/auth/google/callback
```

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`
- **Health Check**: `http://localhost:3000/health`

### Core API Endpoints

#### 🔐 Authentication & User Management

```http
POST   /api/users/auth/register       # User registration with validation
POST   /api/users/auth/login          # Email/password authentication
GET    /api/users/auth/google         # Google OAuth initiation
GET    /api/users/auth/google/callback # Google OAuth callback
POST   /api/users/auth/logout         # Secure logout with token cleanup
GET    /api/users/auth/profile        # User profile retrieval
PUT    /api/users/auth/profile        # Profile updates (name, avatar)
PUT    /api/users/auth/change-password # Password change with validation
```

#### 💳 Subscription Management

```http
GET    /api/subscriptions             # List subscriptions with filtering
POST   /api/subscriptions             # Create subscription with validation
GET    /api/subscriptions/:id         # Get subscription details
PUT    /api/subscriptions/:id         # Update subscription
DELETE /api/subscriptions/:id         # Delete subscription with cleanup
POST   /api/subscriptions/request     # Request slot assignment
GET    /api/subscriptions/my-slots    # User's assigned subscription slots
```

#### 🏢 Service Provider Management

```http
GET    /api/service-providers         # List providers with country filtering
POST   /api/service-providers         # Create provider (admin only)
GET    /api/service-providers/:id     # Get provider with supported countries
PUT    /api/service-providers/:id     # Update provider (admin only)
DELETE /api/service-providers/:id     # Delete provider (admin only)
```

#### 🌍 Geographic & Currency Data

```http
GET    /api/countries                 # List countries with pagination
GET    /api/countries/active          # Active countries only
GET    /api/countries/:id             # Country details with currency
GET    /api/countries/code/:code      # Get country by ISO code
GET    /api/currencies               # List currencies with details
GET    /api/currencies/active        # Active currencies only
```

#### 👑 Administrative Functions

```http
GET    /api/admin/dashboard          # Platform statistics and metrics
GET    /api/admin/users              # User management with pagination
GET    /api/admin/users/:id          # Detailed user information
PUT    /api/admin/users/:id          # Update user profile (admin)
PUT    /api/admin/users/:id/role     # Change user role with protection
DELETE /api/admin/users/:id          # Delete user account with cleanup
```

### Response Format Standards

All API responses follow a consistent format:

```typescript
// Success Response
{
  success: true,
  data: T,
  message?: string,
  pagination?: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}

// Error Response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: ValidationError[]
  }
}
```

## 🏗️ Database Schema & Relationships

### Entity Relationship Diagram

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string name
        string password
        string googleId UK
        string provider
        string role
        boolean isVerified
        boolean isActive
        datetime createdAt
        datetime updatedAt
        datetime lastLoginAt
    }

    RefreshToken {
        string id PK
        string token UK
        string userId FK
        datetime expiresAt
        datetime createdAt
    }

    Country {
        string id PK
        string name UK
        string code UK
        string alpha3 UK
        string numericCode UK
        string continent
        string region
        string currencyId FK
        string phoneCode
        boolean isActive
        datetime createdAt
    }

    Currency {
        string id PK
        string name UK
        string code UK
        string symbol
        int minorUnit
        boolean isActive
        datetime createdAt
    }

    ServiceProvider {
        string id PK
        string name
        string description
        json metadata
        datetime createdAt
        datetime updatedAt
    }

    ServiceProviderCountry {
        string id PK
        string serviceProviderId FK
        string countryId FK
        datetime createdAt
    }

    Subscription {
        string id PK
        string serviceProviderId FK
        string countryId FK
        string name
        string email
        string passwordHash
        int availableSlots
        datetime expiresAt
        json renewalInfo
        decimal userPrice
        string currencyId FK
        json metadata
        boolean isActive
        datetime createdAt
    }

    SubscriptionSlot {
        string id PK
        string userId FK
        string subscriptionId FK
        datetime assignedAt
        boolean isActive
        datetime createdAt
    }

    SubscriptionRequest {
        string id PK
        string userId FK
        string serviceProviderId FK
        string countryId FK
        string status
        string assignedSlotId
        datetime requestedAt
        datetime processedAt
        json metadata
        datetime createdAt
    }

    User ||--o{ RefreshToken : "has refresh tokens"
    User ||--o{ SubscriptionSlot : "has assigned slots"
    User ||--o{ SubscriptionRequest : "makes requests"

    Currency ||--o{ Country : "is currency of"
    Currency ||--o{ Subscription : "prices in"

    Country ||--o{ ServiceProviderCountry : "supported by providers"
    Country ||--o{ Subscription : "located in"
    Country ||--o{ SubscriptionRequest : "requested for"

    ServiceProvider ||--o{ ServiceProviderCountry : "supports countries"
    ServiceProvider ||--o{ Subscription : "provides"
    ServiceProvider ||--o{ SubscriptionRequest : "requested from"

    Subscription ||--o{ SubscriptionSlot : "has slots"

    ServiceProviderCountry }o--|| ServiceProvider : "belongs to"
    ServiceProviderCountry }o--|| Country : "for country"
```

### Key Database Features

- **CUID Primary Keys**: Collision-resistant unique identifiers
- **Cascading Deletes**: Proper foreign key constraint handling
- **Unique Constraints**: Email uniqueness, country codes, currency codes
- **Optimistic Locking**: UpdatedAt timestamps for conflict detection
- **JSON Metadata**: Flexible extension points for future features
- **Index Strategy**: Strategic indexing on frequently queried fields

## 🧪 Testing Strategy

### Comprehensive Test Coverage

```bash
# Run all tests (379 tests)
npm test

# Run specific test suites
npm run test:unit           # Unit tests with mocking
npm run test:integration    # Integration tests with test DB
npm run test:e2e           # End-to-end API tests
```

### Test Architecture & Features

- **🧪 Unit Tests**: Service layer business logic with comprehensive mocking
- **🔗 Integration Tests**: Repository layer with real database interactions
- **🌐 E2E Tests**: Full API workflow testing with authentication
- **🛠️ Automated Cleanup**: `TestDataCleanup` utility prevents database pollution
- **🔄 Sequential Execution**: Tests run sequentially to prevent race conditions
- **📊 Coverage Tracking**: Comprehensive test coverage reporting

### Test Data Management

```typescript
// Automated test data cleanup
import { withTestCleanup } from "../utils/testCleanup";

describe("Subscription Service", () => {
  it(
    "should assign slots with cleanup",
    withTestCleanup(async (cleanup) => {
      const user = await cleanup.getOrCreateTestUser("test@example.com");
      const country = await cleanup.getOrCreateTestCountry(
        "US",
        "United States"
      );
      // Test logic here - cleanup happens automatically
    })
  );
});
```

## 🔒 Security Implementation

### Authentication & Authorization

- **🔐 JWT Implementation**: Secure token generation with configurable expiration
- **🔄 Refresh Token Rotation**: Automatic token refresh with family invalidation
- **🛡️ Password Security**: Bcrypt hashing with 12+ salt rounds
- **🚫 Admin Protection**: Self-operation prevention for admin accounts
- **👥 Role-Based Access Control**: Granular permission system

### Input Validation & Rate Limiting

```typescript
// Multi-layer validation example
const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body("name").isLength({ min: 2, max: 100 }).trim().escape(),
];

// Environment-aware rate limiting
const getRateLimitForEndpoint = (endpoint: string) => {
  return rateLimitConfig[endpoint]; // Centralized configuration
};
```

### Security Headers & Middleware

- **Helmet.js Integration**: Comprehensive security headers
- **CORS Configuration**: Fine-grained cross-origin resource sharing
- **Error Handling**: Sanitized error responses preventing information leaks
- **Request Logging**: Structured logging without sensitive data exposure

## 📊 Performance & Monitoring

### Database Optimization

- **Connection Pooling**: Optimized Prisma client configuration
- **Query Optimization**: Selective field retrieval with proper includes
- **Transaction Management**: Minimal transaction scope with proper error handling
- **Index Strategy**: Strategic indexing on frequently queried fields

### Monitoring & Health Checks

```typescript
// Health check endpoint with system information
GET /api/health
{
  "status": "OK",
  "timestamp": "2025-06-21T22:13:49.000Z",
  "version": "1.0.0",
  "uptime": 3600.5
}
```

### Logging Strategy

- **Structured Logging**: JSON format for machine readability
- **Error Tracking**: Comprehensive error logging with context
- **Performance Monitoring**: Request/response time tracking
- **Security Logging**: Authentication and authorization event logging

## 🤝 Contributing & Development

### Development Standards

- **Clean Architecture**: Maintain strict layer separation
- **TypeScript Strict Mode**: Full type safety across the application
- **Test-Driven Development**: Write tests before implementation
- **Code Review**: Mandatory PR reviews with architecture compliance

### Getting Started with Development

```bash
# Setup development environment
npm run dev          # Start with hot reload
npm run test:watch   # Run tests in watch mode

# Code quality checks
npm run lint         # ESLint checking
npm run format       # Prettier formatting
npm run type-check   # TypeScript compilation check
```

### Pull Request Process

1. **Feature Branch**: Create from main branch with descriptive name
2. **Comprehensive Testing**: Ensure all tests pass and add new tests
3. **Documentation Update**: Update README and API documentation
4. **Changelog Update**: Document changes following semantic versioning

## 🔮 Future Enhancements & Roadmap

The following features are planned or could be contributed by the community:

### 🚀 **Infrastructure & DevOps**

- **Docker Support**: Multi-stage build containers for deployment
- **Redis Caching**: Distributed caching for improved performance
- **Load Balancing**: Multi-instance deployment support
- **CI/CD Pipeline**: Automated testing and deployment workflows

### 📊 **Monitoring & Observability**

- **Request Correlation**: Unique request ID tracking across services
- **Metrics Collection**: Prometheus/Grafana integration
- **Error Tracking**: Sentry or similar error monitoring service
- **Performance APM**: Application performance monitoring

### 🔒 **Advanced Security**

- **OAuth Provider Expansion**: Additional OAuth providers (GitHub, Microsoft)
- **2FA Implementation**: Two-factor authentication support
- **API Key Management**: Service-to-service authentication
- **Audit Logging**: Comprehensive audit trail for compliance

### 🌐 **API Enhancements**

- **GraphQL Support**: Alternative query interface
- **WebSocket Integration**: Real-time notifications
- **API Versioning**: Versioned API endpoints for backward compatibility
- **Bulk Operations**: Batch processing for large datasets

### 📱 **Platform Features**

- **Email Notifications**: Automated email system for user events
- **File Upload**: Avatar and document upload capabilities
- **Search & Filtering**: Advanced search across all entities
- **Data Export**: CSV/JSON export functionality

### 🧪 **Development Tools**

- **API Client Generation**: Auto-generated SDKs for different languages
- **Development Seed Data**: Comprehensive seed data for development
- **Performance Testing**: Load testing and benchmarking tools
- **Code Quality Metrics**: SonarQube integration for technical debt tracking

**Want to contribute?** Check our contribution guidelines and pick an enhancement that interests you!

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

**Built with ❤️ by Van Goeth and contributors**

_Enterprise-grade backend architecture for the modern subscription economy_

</div>
