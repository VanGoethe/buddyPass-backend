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
- **🧪 Test-Driven Development**: Comprehensive test coverage with automated cleanup

## 🚀 Key Features & Capabilities

### 🔐 **Advanced Authentication & Authorization**

- **Multi-Provider Authentication**: Email/password and Google OAuth2 integration
- **JWT Security Architecture**: Access tokens (15min) + Refresh tokens (7 days) with automatic rotation
- **Role-Based Access Control (RBAC)**: Granular permissions with USER/ADMIN roles
- **Session Management**: Secure token lifecycle with blacklisting and cleanup
- **Rate Limiting**: Intelligent brute-force protection with progressive delays

### 🌍 **Subscription Management Platform**

- **Service Provider Network**: Multi-country service provider management with geographical restrictions
- **Subscription Orchestration**: Complex subscription lifecycle with slot management and renewal tracking
- **Country Compliance**: ISO 3166-1 compliant country management with geographic validation
- **Pricing Engine**: Multi-currency support with decimal precision financial calculations
- **Metadata Management**: Flexible JSON-based metadata for extensible data models

### 📊 **Enterprise-Grade Database Design**

- **PostgreSQL with Prisma ORM**: Type-safe database operations with migration management
- **Referential Integrity**: Comprehensive foreign key relationships with cascade handling
- **Transaction Management**: ACID compliance with distributed transaction support
- **Connection Pooling**: Optimized database connections for high-throughput scenarios
- **Data Validation**: Multi-layer validation from database constraints to business rules

### 🛡️ **Security & Compliance**

- **Input Validation**: Comprehensive request validation with sanitization
- **Password Security**: Bcrypt hashing with configurable salt rounds
- **CORS Configuration**: Fine-grained cross-origin resource sharing controls
- **Helmet Integration**: Security headers and vulnerability protection
- **Audit Logging**: Comprehensive request/response logging with correlation IDs

## 📁 Project Architecture

```
src/
├── 🎮 controllers/              # HTTP request handlers (presentation layer)
│   ├── users/                   # User management endpoints
│   ├── subscriptions/           # Subscription CRUD operations
│   ├── serviceProviders/        # Service provider management
│   └── countries/               # Geographic data management
├── 🏢 services/                 # Business logic orchestration
│   ├── users/                   # User domain services
│   ├── subscriptions/           # Subscription business rules
│   └── serviceProviders/        # Provider validation & management
├── 🗄️ repositories/            # Data access layer
│   ├── users/                   # User data persistence
│   ├── subscriptions/           # Subscription data operations
│   └── countries/               # Geographic data access
├── 🏛️ models/                  # Domain entity definitions
│   ├── User.ts                  # User domain model
│   ├── Subscription.ts          # Subscription entity
│   └── ServiceProvider.ts       # Provider domain model
├── 📋 types/                    # TypeScript interfaces & DTOs
│   ├── users/                   # User-related type definitions
│   ├── subscriptions/           # Subscription type contracts
│   └── common/                  # Shared type definitions
├── 🛠️ middleware/              # Express middleware stack
│   ├── auth.ts                  # JWT authentication middleware
│   ├── rateLimiter.ts           # Rate limiting implementation
│   └── validation.ts            # Request validation middleware
├── 🔧 config/                   # Application configuration
│   ├── database.ts              # Database connection setup
│   ├── swagger.ts               # OpenAPI specification
│   └── auth.ts                  # Authentication configuration
├── 🧪 utils/                    # Utility functions & helpers
│   ├── encryption.ts            # Cryptographic utilities
│   ├── validation.ts            # Input validation helpers
│   └── testCleanup.ts           # Test data management
└── 📡 routes/                   # API route definitions
    ├── users.ts                 # User authentication routes
    ├── subscriptions.ts         # Subscription management routes
    └── admin.ts                 # Administrative endpoints

tests/
├── 🧪 unit/                     # Unit tests with mocking
├── 🔗 integration/              # Integration tests with test DB
├── 🌐 e2e/                     # End-to-end API tests
└── 🛠️ utils/                   # Test utilities & fixtures
```

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js 18+** (LTS recommended)
- **PostgreSQL 13+** with extensions support
- **Google OAuth Credentials** (for OAuth integration)
- **Git** for version control

### Installation & Setup

```bash
# 1. Clone the repository
git clone git@github.com:VanGoethe/buddyPass-backend.git
cd buddyPass-backend

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

# JWT Security
JWT_SECRET="your_256_bit_secret_key_here"
JWT_REFRESH_SECRET="your_256_bit_refresh_secret_here"

# Google OAuth (Optional)
GOOGLE_CLIENT_ID="your_google_oauth_client_id"
GOOGLE_CLIENT_SECRET="your_google_oauth_client_secret"

# Application Configuration
NODE_ENV="development"
PORT=3000
CORS_ORIGIN="http://localhost:3000"

# Admin Setup (for create-admin script)
ADMIN_EMAIL="admin@yourcompany.com"
ADMIN_PASSWORD="SecureAdminPassword123!"
ADMIN_NAME="Platform Administrator"
```

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: `http://localhost:3000/api-docs`
- **OpenAPI Spec**: `http://localhost:3000/api-docs.json`

### Core API Endpoints

#### 🔐 Authentication & User Management

```http
POST   /api/users/auth/register         # User registration
POST   /api/users/auth/login            # User authentication
POST   /api/users/auth/refresh          # Token refresh
POST   /api/users/auth/logout           # Secure logout
GET    /api/users/auth/profile          # User profile
PUT    /api/users/auth/profile          # Update profile
PUT    /api/users/auth/change-password  # Password change
```

#### 🌍 Geographic Data Management

```http
GET    /api/countries                   # List countries (paginated)
GET    /api/countries/active            # Active countries only
GET    /api/countries/:id               # Country details
GET    /api/countries/code/:code        # Get by ISO code
POST   /api/countries                   # Create country (admin)
PUT    /api/countries/:id               # Update country (admin)
```

#### 🏢 Service Provider Management

```http
GET    /api/service-providers           # List providers (filtered)
GET    /api/service-providers/:id       # Provider details
POST   /api/service-providers          # Create provider (admin)
PUT    /api/service-providers/:id       # Update provider (admin)
DELETE /api/service-providers/:id       # Delete provider (admin)
```

#### 💳 Subscription Management

```http
GET    /api/subscriptions              # List subscriptions (filtered)
GET    /api/subscriptions/:id          # Subscription details
POST   /api/subscriptions             # Create subscription
PUT    /api/subscriptions/:id          # Update subscription
DELETE /api/subscriptions/:id          # Delete subscription
```

#### 👑 Administrative Functions

```http
GET    /api/admin/dashboard            # Platform statistics
GET    /api/admin/users                # User management
PUT    /api/admin/users/:id/role       # Role management
GET    /api/admin/system/health        # System health check
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

### Entity Relationship Overview

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string name
        string password
        string role
        boolean isVerified
        datetime createdAt
    }

    RefreshToken {
        string id PK
        string token UK
        string userId FK
        datetime expiresAt
    }

    Country {
        string id PK
        string name UK
        string code UK
        string alpha3 UK
        string continent
        boolean isActive
    }

    ServiceProvider {
        string id PK
        string name
        string description
        json metadata
        datetime createdAt
    }

    Subscription {
        string id PK
        string serviceProviderId FK
        string countryId FK
        string name
        string email
        int availableSlots
        decimal userPrice
        datetime expiresAt
    }

    ServiceProviderCountry {
        string id PK
        string serviceProviderId FK
        string countryId FK
    }

    User ||--o{ RefreshToken : "has"
    ServiceProvider ||--o{ ServiceProviderCountry : "supports"
    Country ||--o{ ServiceProviderCountry : "supported_by"
    ServiceProvider ||--o{ Subscription : "provides"
    Country ||--o{ Subscription : "located_in"
```

## 🧪 Testing Strategy

### Comprehensive Test Coverage

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests with mocking
npm run test:integration    # Integration tests with test DB
npm run test:e2e           # End-to-end API tests

# Test coverage report
npm run test:coverage
```

### Test Architecture

- **🧪 Unit Tests**: Service layer business logic with comprehensive mocking
- **🔗 Integration Tests**: Repository layer with real database interactions
- **🌐 E2E Tests**: Full API workflow testing with authentication
- **🛠️ Test Utilities**: Automated test data cleanup preventing database pollution

### Test Data Management

```typescript
// Automated test data cleanup
import { withTestCleanup } from "../utils/testCleanup";

describe("User Service", () => {
  it(
    "should create user with cleanup",
    withTestCleanup(async (cleanup) => {
      const user = await cleanup.getOrCreateTestUser("test@example.com");
      // Test logic here...
      // Cleanup happens automatically
    })
  );
});
```

## 🔒 Security Implementation

### Authentication Security

- **🔐 JWT Implementation**: RS256 algorithm with short-lived access tokens
- **🔄 Token Rotation**: Automatic refresh token rotation with family invalidation
- **🛡️ Password Security**: Bcrypt with configurable salt rounds (12+)
- **🚫 Session Management**: Token blacklisting and secure logout

### Input Validation & Sanitization

```typescript
// Multi-layer validation example
const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body("name").optional().trim().escape(),
];
```

### Rate Limiting Strategy

```typescript
// Progressive rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
```

## 📊 Performance & Scalability

### Database Optimization

- **Connection Pooling**: Optimized pool size for concurrent requests
- **Query Optimization**: Selective field retrieval and efficient joins
- **Index Strategy**: Strategic indexing on frequently queried fields
- **Transaction Management**: Minimal transaction scope with rollback handling

### Caching Strategy

- **Response Caching**: Implemented for static data (countries, providers)
- **Query Result Caching**: Database query result caching for expensive operations
- **Redis Integration**: Ready for distributed caching implementation

### Monitoring & Observability

```typescript
// Request correlation tracking
app.use((req, res, next) => {
  req.correlationId = uuidv4();
  res.set("X-Correlation-ID", req.correlationId);
  next();
});
```

## 🚀 Deployment & DevOps

### Production Configuration

```bash
# Production build
npm run build

# Start production server
npm start

# Database migrations in production
npm run migrate:deploy
```

### Docker Support

```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Health Checks

```http
GET /api/admin/system/health
```

Returns comprehensive system status including database connectivity, memory usage, and response times.

## 🔄 Development Workflow

### Git Workflow

- **Feature Branches**: `feature/feature-name`
- **Conventional Commits**: Standardized commit messages
- **Code Review**: Mandatory PR reviews with architecture compliance checks
- **Automated Testing**: CI/CD pipeline with comprehensive test coverage

### Code Quality Standards

- **TypeScript Strict Mode**: Full type safety with strict compiler options
- **ESLint + Prettier**: Automated code formatting and linting
- **Husky Pre-commit Hooks**: Automated testing and formatting on commit
- **SonarQube Integration**: Code quality metrics and technical debt tracking

## 📈 Monitoring & Analytics

### Logging Strategy

```typescript
// Structured logging with correlation IDs
logger.info("User registration attempt", {
  correlationId: req.correlationId,
  email: sanitizeEmail(req.body.email),
  userAgent: req.get("User-Agent"),
  ip: req.ip,
});
```

### Metrics & Alerting

- **Response Time Monitoring**: P95, P99 response time tracking
- **Error Rate Tracking**: 4xx/5xx error rate monitoring with alerting
- **Database Performance**: Query performance monitoring with slow query alerts
- **Security Monitoring**: Failed authentication attempt tracking

## 🤝 Contributing

### Development Setup

1. **Fork & Clone**: Fork the repository and clone locally
2. **Environment Setup**: Copy `.env.example` and configure for development
3. **Database Setup**: Run migrations and seed data
4. **Testing**: Ensure all tests pass before submitting PR

### Code Standards

- **Clean Architecture**: Follow established layer separation
- **Interface Segregation**: Define clear contracts between layers
- **Test Coverage**: Maintain >90% test coverage
- **Documentation**: Update API documentation with changes

### Pull Request Process

1. **Feature Branch**: Create from `develop` branch
2. **Comprehensive Testing**: Unit, integration, and E2E tests
3. **Documentation Update**: Update README and API docs
4. **Code Review**: At least two approvals required
5. **Automated Checks**: All CI/CD checks must pass

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the BuddyPass Team**

_Enterprise-grade backend architecture for the modern subscription economy_

</div>
