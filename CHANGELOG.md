# Changelog

All notable changes to the BuddyPass Backend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.7.3] - 2025-06-13

### Fixed - Authentication Middleware

- **User Activity Handling**: `authenticateJWT` and `optionalAuth` now preserve the `isActive` flag without forcing it to `true`, ensuring deactivated accounts are properly recognized.


## [1.7.2] - 2025-06-04

### Fixed - Swagger Documentation Country Relationships

- **Swagger Examples Corrected**: Fixed all API documentation examples to properly reflect country ID relationships

  - **Service Provider Examples**: Updated all examples to show `supportedCountryIds` in requests and `supportedCountries` array with full country objects in responses
  - **Subscription Examples**: Updated all examples to use `countryId` in requests and show proper country object in responses
  - **Schema Consistency**: Ensured all Swagger schemas match the actual API implementation with proper country relationships
  - **Request/Response Alignment**: Fixed discrepancy between documented examples and actual API behavior

- **Route Documentation Updates**: Comprehensive updates to OpenAPI annotations in route files

  - **Service Provider Routes**: Fixed examples in `src/routes/serviceProviders.ts` to show proper country ID format
  - **Subscription Routes**: Fixed examples in `src/routes/subscriptions.ts` to use `countryId` instead of string country values
  - **Consistent Formatting**: Standardized all country-related examples to use realistic CUID format IDs
  - **Response Examples**: Added proper country objects in all response examples with id, name, code, and alpha3 fields

### Technical Details

- **Documentation Accuracy**: Swagger UI now correctly displays the country relationship structure implemented in the backend
- **Developer Experience**: API consumers can now rely on accurate examples when integrating with service provider and subscription endpoints
- **Schema Validation**: All request/response examples are now consistent with the actual API schema definitions
- **Field Mapping**: Corrected field names and types to match the implemented country relationship structure

### Impact

- **API Documentation**: Swagger UI examples now accurately reflect the actual API behavior for country relationships
- **Integration Support**: Developers integrating with the API will see correct examples for country ID usage
- **Testing Consistency**: Documentation examples match the implementation for better testing and validation

## [1.7.1] - 2025-06-04

### Added - Swagger Documentation Updates and Test Infrastructure

- **Enhanced Swagger Documentation**: Updated OpenAPI specifications to reflect country relationship changes

  - **Service Provider Schemas**: Updated to include `supportedCountries` array and `supportedCountryIds` in requests
  - **Subscription Schemas**: Updated to use `countryId` field and include country object in responses
  - **Request/Response Examples**: Added comprehensive examples for all country-related operations
  - **Schema Validation**: Enhanced validation rules for country relationships and constraints

- **Test Infrastructure Improvements**: Enhanced testing framework with proper data management

  - **Test Data Cleanup Utility**: Created `TestDataCleanup` class for managing test data lifecycle
  - **Automated Cleanup**: Tests now automatically clean up created entities to prevent database saturation
  - **Entity Tracking**: Comprehensive tracking of created users, countries, service providers, and subscriptions
  - **Utility Functions**: Added `withTestCleanup` wrapper for easy test data management

- **Repository Test Fixes**: Updated integration tests to match new country relationship implementations

  - **Service Provider Tests**: Fixed test expectations to include `supportedCountries` include parameters
  - **Subscription Tests**: Updated tests to use `countryId` instead of country string filtering
  - **Mock Improvements**: Enhanced mocking to properly simulate database transactions and relationships

### Changed

- **Test Data Management**: Implemented systematic approach to test data cleanup

  - **Database Hygiene**: Tests now clean up after themselves to prevent data accumulation
  - **Entity Dependencies**: Proper cleanup order respecting foreign key relationships
  - **Performance**: Reduced test database size and improved test execution speed

- **API Documentation Standards**: Enhanced Swagger documentation quality

  - **Schema Completeness**: All schemas now include proper field descriptions and validation rules
  - **Response Examples**: Added realistic examples for all API responses
  - **Error Documentation**: Comprehensive error response documentation with proper status codes

### Fixed

- **Test Suite Issues**: Resolved multiple test failures related to country relationship changes

  - **Repository Tests**: Fixed include parameter expectations in service provider and subscription tests
  - **Service Tests**: Updated mock objects to include missing repository methods and country dependencies
  - **Type Consistency**: Fixed TypeScript type mismatches in test mock objects

- **Authentication Tests**: Fixed missing role fields in user mock objects and token payloads

  - **User Mocks**: Added required `role` field to all user mock objects
  - **Token Payloads**: Updated JWT token payload mocks to include role information
  - **Service Mocks**: Added missing methods to service and repository mocks

### Technical Details

- **Test Data Lifecycle**: Implemented proper test data lifecycle management to prevent database pollution
- **Documentation Accuracy**: Ensured Swagger documentation accurately reflects current API implementation
- **Type Safety**: Enhanced TypeScript type safety in test suites with proper mock typing
- **Cleanup Automation**: Automated test data cleanup reduces manual database maintenance

### Development Guidelines

- **Test Data Management**: All tests must use `TestDataCleanup` utility or `withTestCleanup` wrapper
- **Entity Cleanup**: Tests creating entities must track and clean them up after completion
- **Documentation Updates**: API changes must be accompanied by corresponding Swagger updates
- **Mock Completeness**: Test mocks must include all required interface methods and properties

## [1.7.0] - 2025-06-04

### Added - Service Provider and Subscription Country Relationships

- **Service Provider Country Support**: Enhanced service providers to support multiple countries through proper relationships

  - **Many-to-Many Relationships**: Service providers can now support multiple countries via `ServiceProviderCountry` junction table
  - **Country Validation**: Added validation to ensure only active countries can be associated with service providers
  - **Supported Countries API**: Service providers now include supported countries in API responses with full country details

- **Subscription Country Integration**: Updated subscriptions to use proper country relationships

  - **Country ID References**: Changed from string-based country field to proper `countryId` foreign key relationship
  - **Country Validation**: Subscriptions can only be created for countries supported by the selected service provider
  - **Enhanced Responses**: Subscription responses now include full country details when available

- **Enhanced API Endpoints**: Updated existing endpoints with country relationship support

  - **Service Provider Creation**: `POST /api/service-providers` now accepts `supportedCountryIds` array
  - **Service Provider Updates**: `PUT /api/service-providers/:id` supports updating supported countries
  - **Service Provider Queries**: `GET /api/service-providers` supports filtering by `countryId`
  - **Subscription Creation**: `POST /api/subscriptions` now accepts `countryId` instead of country string
  - **Subscription Updates**: `PUT /api/subscriptions/:id` supports updating country with validation
  - **Subscription Queries**: `GET /api/subscriptions` supports filtering by `countryId`

- **Repository Enhancements**: Extended repository interfaces with country relationship methods
  - **Service Provider Repository**: Added `addSupportedCountries`, `removeSupportedCountries`, `getSupportedCountries` methods
  - **Subscription Repository**: Enhanced to handle country relationships with `includeCountry` parameter
  - **Transaction Support**: All country relationship operations use database transactions for consistency

### Changed

- **Type System Updates**: Updated all interfaces and DTOs to reflect new country relationships

  - **Service Provider Types**: Added `supportedCountryIds` to create/update DTOs and `supportedCountries` to response DTOs
  - **Subscription Types**: Changed `country` string field to `countryId` and added country relationship to response DTOs
  - **Query Options**: Added `countryId` filtering to both service provider and subscription query options

- **Domain Models**: Updated domain models to handle country relationships

  - **Service Provider Model**: Added `supportedCountries` field and validation for country limits (max 50 countries)
  - **Subscription Model**: Updated to use `countryId` and include country relationship in responses
  - **Validation Logic**: Enhanced validation to check country limits and relationship constraints

- **Service Layer**: Enhanced business logic with comprehensive country validation

  - **Service Provider Service**: Added country ID validation and relationship management
  - **Subscription Service**: Added country-service provider compatibility validation
  - **Dependency Injection**: Updated service factories to include country repository dependencies

- **Database Operations**: Enhanced repository implementations with relationship handling
  - **Transaction Management**: All country relationship operations use proper database transactions
  - **Include Options**: Added optional country inclusion in queries for performance optimization
  - **Error Handling**: Enhanced error messages for country relationship validation failures

### Technical Details

- **Referential Integrity**: Proper foreign key relationships ensure data consistency
- **Performance Optimization**: Optional country inclusion prevents unnecessary joins
- **Validation Chain**: Multi-layer validation ensures country-service provider compatibility
- **Transaction Safety**: All multi-table operations use database transactions
- **Type Safety**: Comprehensive TypeScript interfaces prevent runtime errors

### Migration Notes

- **Database Schema**: The Prisma schema already includes proper relationships - no migration needed
- **API Compatibility**: Breaking changes to subscription API - `country` field replaced with `countryId`
- **Service Provider API**: New optional `supportedCountryIds` field in create/update requests
- **Existing Data**: Manual migration may be needed for existing subscription country strings

### Breaking Changes

- **Subscription API**: `country` field in requests/responses changed to `countryId` (string) and `country` (object)
- **Service Provider Responses**: Now include `supportedCountries` array with full country details
- **Query Parameters**: Subscription and service provider queries now use `countryId` instead of `country` string

## [1.6.0] - 2025-06-04

### Added - Country CRUD Feature Implementation

- **Country Management System**: Complete CRUD operations for country management with ISO standards compliance

  - **Database Schema**: Added `Country` model with ISO 3166-1 codes and geographic information
  - **Service Provider Relationships**: Added `ServiceProviderCountry` junction table for many-to-many relationships
  - **Subscription Integration**: Updated subscriptions to reference countries by ID instead of raw strings

- **Country API Endpoints**: Full REST API with comprehensive Swagger documentation

  - `POST /api/countries` - Create new country (admin only)
  - `GET /api/countries` - List countries with pagination and filtering
  - `GET /api/countries/active` - Get all active countries
  - `GET /api/countries/:id` - Get country by ID
  - `GET /api/countries/code/:code` - Get country by ISO alpha-2 code
  - `PUT /api/countries/:id` - Update country (admin only)
  - `DELETE /api/countries/:id` - Delete country (admin only, with referential integrity checks)

- **ISO Standards Compliance**: Comprehensive validation for international standards

  - **ISO 3166-1 alpha-2**: 2-letter country codes (e.g., US, GB, CA)
  - **ISO 3166-1 alpha-3**: 3-letter country codes (e.g., USA, GBR, CAN)
  - **ISO 3166-1 numeric**: 3-digit numeric codes (e.g., 840, 826, 124)
  - **ISO 4217**: Currency code validation (e.g., USD, EUR, GBP)
  - **Phone Code Validation**: International phone code format (+X to +XXXX)

- **Advanced Query Features**: Comprehensive filtering and search capabilities

  - **Pagination**: Page-based pagination with configurable limits
  - **Search**: Full-text search across name, code, and alpha-3 fields
  - **Filtering**: Filter by continent, region, and active status
  - **Sorting**: Sort by name, code, creation date, or update date

- **Clean Architecture Implementation**: Following established patterns

  - **Repository Layer**: `PrismaCountryRepository` with comprehensive data access methods
  - **Service Layer**: `CountryService` with business logic and validation
  - **Controller Layer**: `CountryController` with HTTP request/response handling
  - **Domain Model**: `Country` model with validation and transformation methods
  - **Type System**: Complete TypeScript interfaces and DTOs

- **Comprehensive Test Coverage**: Extensive unit tests for all layers

  - **Model Tests**: Validation, normalization, and transformation logic
  - **Repository Tests**: Data access and query operations
  - **Service Tests**: Business logic and error handling
  - **Controller Tests**: HTTP request/response handling
  - **Integration Tests**: End-to-end API functionality

- **Swagger Documentation**: Complete OpenAPI 3.0 specification
  - **Schema Definitions**: All request/response schemas with examples
  - **Parameter Documentation**: Query parameters, path parameters, and request bodies
  - **Response Documentation**: All possible HTTP status codes and error scenarios
  - **Authentication**: Proper security scheme documentation for protected endpoints

### Changed

- **Database Schema Migration**: Updated Prisma schema with new relationships

  - **Subscription Model**: Changed `country` field from string to `countryId` foreign key
  - **Service Provider Model**: Added `supportedCountries` relationship through junction table
  - **Referential Integrity**: Added proper foreign key constraints and cascade rules

- **Dependency Injection**: Updated container to include country module dependencies
  - **Factory Functions**: Added creation functions for repository, service, and controller
  - **Route Integration**: Added country routes to main router configuration
  - **Type Exports**: Updated main type exports to include country interfaces

### Technical Details

- **Data Normalization**: Automatic case normalization for ISO codes and currency codes
- **Duplicate Prevention**: Comprehensive uniqueness validation for codes and names
- **Referential Integrity**: Prevents deletion of countries referenced by service providers or subscriptions
- **Error Handling**: Detailed error messages with proper HTTP status codes
- **Performance**: Optimized queries with proper indexing on unique fields
- **Security**: Admin-only endpoints for create, update, and delete operations

### Migration Notes

- **Database Migration**: Run `npx prisma migrate dev` to apply schema changes
- **Existing Data**: Subscription country strings need manual migration to country IDs
- **Service Providers**: Update metadata to use country IDs instead of country code arrays

## [1.5.2] - 2025-06-04

### Fixed

- **Service Provider API Response Format**: Fixed service provider endpoints to return proper nested response structure matching Swagger documentation
  - Fixed `POST /api/service-providers` response format from `data: serviceProvider` to `data: { serviceProvider }`
  - Fixed `GET /api/service-providers/:id` response format to match documentation
  - Fixed `PUT /api/service-providers/:id` response format to match documentation
- **Error Handling**: Enhanced error handling in service provider controller with detailed error logging and development mode error details
- **JSON Metadata Validation**: Improved metadata validation to handle complex JSON objects and provide better error messages for invalid JSON

### Added

- **Comprehensive Test Coverage**: Added extensive unit and end-to-end tests for service provider functionality
  - Added unit tests for controller response format validation
  - Added E2E tests for complex metadata handling (nested objects, arrays, booleans)
  - Added tests for authentication error scenarios
  - Added tests for validation edge cases and error handling
- **Enhanced Error Logging**: Added detailed error logging in development mode for better debugging
- **Metadata Validation**: Enhanced JSON metadata validation with proper serialization checks

### Changed

- **Response Structure**: Updated all service provider endpoints to use consistent nested response format
- **Error Messages**: Improved error messages to be more descriptive and helpful for debugging
- **Development Experience**: Enhanced error details in development mode while maintaining security in production

### Technical Details

- Fixed response format inconsistency between controller implementation and Swagger documentation
- Enhanced metadata validation to properly handle complex JSON structures including nested objects, arrays, and primitive types
- Added comprehensive test coverage for all service provider CRUD operations
- Improved error handling with proper HTTP status codes and detailed error messages
- Added development mode error details while maintaining production security

## [1.5.1] - 2025-06-04

### Added

- Changelog file for tracking project changes
- Updated cursor rules to include changelog maintenance
- **Date Verification Process**: Added requirement to run `date` command before changelog updates
- **Accurate Dating Standards**: Mandatory date verification to prevent estimated dates in changelog entries

## [1.3.0] - 2025-05-29

### Added - Admin User System Implementation

- **Role-Based User System**: Added `UserRole` enum with `USER` and `ADMIN` values
- **Database Schema Updates**: Added `role` field to User model with default `USER` role
- **Admin Authentication**: Extended JWT tokens to include user role information
- **Admin Middleware**: Added `requireAdmin` and `requireAdminOrOwnership` middleware functions
- **Admin Management Features**:
  - Admin user creation via API and script
  - Admin dashboard with platform statistics
  - User management endpoints (view all users, activate/deactivate accounts)
- **Admin Creation Script**: `npm run create-admin` command for initial admin setup
- **Admin API Endpoints**:
  - `GET /api/admin/dashboard` - Platform statistics
  - `GET /api/admin/users` - User management
  - `PUT /api/admin/users/:userId/status` - Update user status
  - `POST /api/admin/users` - Create admin user

### Security

- **Enhanced Password Requirements**: Strict password validation for admin accounts
- **Self-Protection**: Admins cannot deactivate their own accounts
- **Role Validation**: All admin endpoints require valid admin role verification
- **Rate Limiting**: Admin endpoints inherit authentication rate limiting

### Changed

- JWT tokens now include role information alongside userId and email
- User responses optionally include role information for backward compatibility
- **Cursor Rules**: Enhanced changelog maintenance section with date verification requirements
- **Documentation Process**: Improved changelog accuracy with mandatory date checking

## [1.2.0] - 2025-05-28

### Added - Architecture Restructuring

- **Clean Architecture Implementation**: Proper separation of concerns across layers
- **Repository Layer**: Added repository pattern with Prisma abstraction
  - `IUserRepository` interface for data access contracts
  - `PrismaUserRepository` implementation for database operations
- **Domain-Driven Directory Structure**:
  - `src/controllers/users/` - HTTP request handlers
  - `src/services/users/` - Business logic layer
  - `src/repositories/users/` - Data persistence layer
  - `src/models/users/` - Entity definitions
  - `src/types/users/` - Interfaces and DTOs
- **Dependency Injection Container**: Centralized dependency management
- **Enhanced Type System**: Comprehensive DTOs and interfaces
  - `CreateUserData`, `UpdateUserData` for data operations
  - `RegisterRequest/Response`, `LoginRequest/Response` for API contracts
  - `UserResponse` for safe API responses (no sensitive fields)

### Changed

- **Dependency Flow**: Established Controller → Service → Repository → Database pattern
- **MVP-Compliant Endpoints**: Updated routes to follow specification
- **Improved Testability**: All layers now support dependency injection for easy mocking

### Technical Debt

- **Backward Compatibility**: Maintained old route structure while implementing new architecture
- **Migration Path**: Clear separation allows for gradual migration to new patterns

## [1.1.0] - 2025-05-27

### Added - Authentication System Consolidation

- **Unified Authentication**: Consolidated dual authentication systems into single clean implementation
- **Enhanced User Management**:
  - `changePassword` functionality with proper validation
  - Updated user profile management
  - Comprehensive error handling
- **Standardized API Endpoints**: All authentication under `/api/users/` namespace
  - `POST /api/users/register` - User registration
  - `POST /api/users/login` - User authentication
  - `POST /api/users/logout` - User logout
  - `GET /api/users/profile` - Get user profile
  - `PUT /api/users/profile` - Update user profile
  - `PUT /api/users/change-password` - Change user password
  - `GET /api/users/auth/google` - Google OAuth initiation
  - `GET /api/users/auth/google/callback` - Google OAuth callback

### Removed

- **Legacy Authentication System**: Removed redundant auth implementation
  - Deleted `src/routes/auth.ts`
  - Deleted `src/services/authService.ts`
  - Deleted `src/controllers/authController.ts`
  - Removed `/api/auth/` route namespace

### Changed

- **Simplified Token Strategy**: Moved from refresh tokens to simple JWT for MVP simplicity
- **Consistent Response Format**: Standardized API response structure across all endpoints
- **Enhanced Security**: Centralized authentication logic with proper error handling

### Fixed

- **Authentication Redundancy**: Eliminated confusion between dual authentication systems
- **Code Maintenance**: Reduced code duplication and improved maintainability
- **Test Coverage**: Updated all tests to reflect consolidated authentication system

## [1.0.0] - 2025-05-25

### Added - Initial Release

- **Core Authentication System**: Basic user registration and login functionality
- **Database Integration**: Prisma ORM with PostgreSQL database
- **JWT Authentication**: Token-based authentication system
- **Google OAuth**: Social authentication integration
- **Password Security**: Bcrypt password hashing
- **Request Validation**: Express validator middleware
- **Rate Limiting**: API endpoint protection
- **Environment Configuration**: Secure environment variable management
- **Health Check**: Basic server health monitoring
- **TypeScript Support**: Full type safety throughout application
- **Testing Framework**: Unit and integration tests
- **Development Tools**:
  - Hot reload with ts-node-dev
  - ESLint and Prettier configuration
  - Comprehensive error handling middleware

### Database Schema

- **User Model**: Core user entity with authentication fields
- **Database Migrations**: Prisma migration system
- **Connection Pooling**: Optimized database connections

### API Documentation

- **RESTful Endpoints**: Standard HTTP methods and status codes
- **Request/Response Schemas**: Comprehensive API contracts
- **Error Handling**: Consistent error response format

## [1.5.0] - 2024-12-19

---

## Changelog Maintenance Guidelines

### When to Update

- **Every Feature Addition**: New functionality, endpoints, or major changes
- **Bug Fixes**: Significant bug resolutions
- **Security Updates**: Any security-related changes
- **Breaking Changes**: Changes that affect API compatibility
- **Dependency Updates**: Major dependency upgrades
- **Performance Improvements**: Notable performance optimizations

### Format Standards

- **Semantic Versioning**: Use MAJOR.MINOR.PATCH versioning
- **Categories**: Added, Changed, Deprecated, Removed, Fixed, Security
- **Clear Descriptions**: Include what changed and why
- **Breaking Changes**: Clearly mark any breaking changes
- **Migration Notes**: Include upgrade instructions when needed

### Review Process

- Update changelog in same PR as the changes
- Include changelog entry in PR description
- Ensure date accuracy for releases
- Maintain chronological order (newest first)
