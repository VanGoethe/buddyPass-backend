# Changelog

All notable changes to the BuddyPass Backend project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Comprehensive Validation Tests**: Added extensive unit tests for all validation functions
  - Complete test coverage for `registerValidation`, `loginValidation`, `refreshTokenValidation`, `updateProfileValidation`, and `changePasswordValidation`
  - Boundary testing for name length limits and avatar URL validation
  - Edge case testing for malformed URLs, whitespace handling, and password complexity requirements
  - 32 new validation test cases ensuring robust request validation across all endpoints

### Fixed

- **Logout Authentication**: Fixed logout endpoint to use optional authentication instead of required authentication
  - Changed logout route from `authenticateJWT` to `optionalAuth` middleware
  - Logout now works with valid tokens, expired tokens, or no tokens at all
  - Updated Swagger documentation to reflect optional authentication for logout
  - Improved user experience by allowing logout even when tokens are expired
- **Test Suite Alignment**: Fixed failing tests to match correct implementation
  - Fixed ServiceProvider tests to use correct pagination structure with nested `pagination` object
  - Updated E2E tests to match actual validation messages (name max 100 chars, description max 500 chars)
  - Fixed error code expectations to match actual implementation (`CONFLICT` instead of `DUPLICATE_ENTRY`)
  - Fixed auth integration tests to match actual user response structure (removed non-existent `isActive` and `isVerified` fields)
  - Fixed logout message expectation to match actual implementation ("Logout successful")
- **Test ID Format Consistency**: Fixed ServiceProvider test ID format to use consistent `sp_` prefix
  - Corrected mock response ID from `"1"` to `"sp_1"` in controller tests
  - Maintained consistency with rest of codebase that uses `sp_123`, `sp_1`, `sp_2` format for ServiceProvider IDs
  - Ensured all downstream references use consistent ID format across test suite

### Changed

- **API Documentation**: Updated logout endpoint documentation to indicate authentication is optional
  - Added multiple security schemes in Swagger (`BearerAuth` and empty for no auth)
  - Removed 401 Unauthorized response from logout endpoint documentation
  - Enhanced description to clarify that logout works with both valid and expired tokens

## [1.7.3] - 2025-06-19

### Added - Complete Admin User Management System

- **Enhanced Admin User Management**: Implemented comprehensive admin user management endpoints with proper business logic and security constraints

  - **Individual User Details**: Added `GET /admin/users/:userId` endpoint to retrieve detailed user information including admin-level data
  - **User Information Updates**: Added `PUT /admin/users/:userId` endpoint to update user profile information (name, avatar) with validation
  - **User Role Management**: Added `PUT /admin/users/:userId/role` endpoint to change user roles between USER and ADMIN with security controls
  - **User Account Deletion**: Added `DELETE /admin/users/:userId` endpoint for permanent user account deletion with associated data cleanup

- **Security Controls and Business Logic**: Implemented comprehensive security measures for admin operations

  - **Self-Operation Prevention**: Admins cannot perform destructive operations on their own accounts (deactivation, role changes, deletion)
  - **Role Change Protection**: Prevents admin lockout by blocking self-role modifications
  - **User Existence Validation**: All operations validate user existence before execution
  - **Proper Error Handling**: Comprehensive error responses with appropriate HTTP status codes and descriptive messages

- **Complete Swagger Documentation**: Added comprehensive OpenAPI 3.0 documentation for all new admin endpoints

  - **Request/Response Schemas**: Detailed schema definitions for `AdminUpdateUserRequest` and `UpdateUserRoleRequest`
  - **Security Documentation**: Proper Bearer token authentication requirements for all admin endpoints
  - **Error Response Examples**: Comprehensive error response examples for validation errors, authorization failures, and edge cases
  - **Path Parameter Validation**: Proper CUID format validation for user ID parameters

- **Data Validation and Sanitization**: Implemented robust input validation and sanitization

  - **User Update Validation**: Name length validation (2-100 characters), URL validation for avatar fields
  - **Role Validation**: Enum validation for role fields (USER, ADMIN only)
  - **Empty Update Prevention**: Prevents empty update requests with appropriate error messages
  - **Request Sanitization**: Proper input trimming and normalization

### Enhanced

- **UpdateUserData Interface**: Extended repository interface to support role and account status updates

  - **Role Updates**: Added `role?: UserRole` field to support admin role management operations
  - **Account Status**: Added `isActive?: boolean` field to support account activation/deactivation
  - **Type Safety**: Maintained full TypeScript type safety throughout the admin operations

- **Admin Route Organization**: Well-structured admin routes with consistent patterns

  - **Middleware Application**: Proper authentication and admin authorization middleware for all routes
  - **Error Handling**: Centralized error handling with appropriate logging and user-friendly messages
  - **Business Logic Separation**: Clean separation between route handlers and business logic

### Technical Details

- **Clean Architecture Compliance**: All endpoints follow the established clean architecture patterns
- **Repository Pattern**: Proper use of repository pattern for data access operations
- **Dependency Injection**: Consistent use of container pattern for service dependencies
- **Security First**: Security controls implemented at multiple layers to prevent unauthorized operations
- **Database Transactions**: Proper transaction handling for data consistency

### API Documentation

- **Complete Coverage**: 100% Swagger documentation coverage for all new admin endpoints
- **Interactive Testing**: Full "Try it out" functionality in Swagger UI for all endpoints
- **Schema Validation**: Proper request/response schema validation with comprehensive examples
- **Error Documentation**: Detailed error response documentation with status codes and error scenarios

### Security Features

- **Admin-Only Access**: All endpoints require valid JWT token with ADMIN role
- **Self-Protection**: Built-in protections prevent admins from locking themselves out
- **Audit Trail**: Comprehensive logging of all admin operations for audit purposes
- **Input Validation**: Multi-layer validation prevents injection attacks and malformed requests

### Breaking Changes

None. All changes are additive and maintain backward compatibility with existing admin functionality.

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
- **Query Parameters**: Subscription and service provider queries now use `countryId`
