# Admin User System Implementation

## Overview

The BuddyPass backend now includes a comprehensive admin user system that provides role-based access control for platform management. This system distinguishes between regular users and admin users, with admins having full access to platform management features.

## Key Features

### 1. Role-Based User System

- **USER**: Regular platform users who can create profiles and access standard features
- **ADMIN**: Platform administrators with full management access

### 2. Database Schema Updates

- Added `UserRole` enum with `USER` and `ADMIN` values
- Updated `User` model to include `role` field with default value of `USER`
- Maintained backward compatibility with existing user data

### 3. Authentication & Authorization

- Extended JWT tokens to include user role information
- Added admin-only middleware (`requireAdmin`)
- Added admin-or-ownership middleware (`requireAdminOrOwnership`)
- Role information included in user responses

### 4. Admin Management Features

- Admin user creation via API and script
- Admin dashboard with platform statistics
- User management (view all users, activate/deactivate accounts)
- Platform oversight capabilities

## Implementation Details

### Database Schema Changes

```prisma
enum UserRole {
  USER
  ADMIN
}

model User {
  // ... existing fields
  role        UserRole @default(USER)
  // ... rest of fields
}
```

### Admin Middleware

```typescript
// Admin-only access
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({
      error: { code: "ADMIN_REQUIRED", message: "Admin access required" },
    });
  }
  next();
};
```

### JWT Token Enhancement

JWT tokens now include role information:

```typescript
{
  userId: string,
  email: string,
  role: UserRole
}
```

## Admin User Creation

### Method 1: Script (Recommended for Initial Setup)

```bash
npm run create-admin
```

Environment variables can be used to customize:

- `ADMIN_EMAIL`: Admin email (default: admin@buddypass.com)
- `ADMIN_PASSWORD`: Admin password (default: AdminPass123!)
- `ADMIN_NAME`: Admin name (default: BuddyPass Admin)

### Method 2: API Endpoint (Admin-only)

```http
POST /api/admin/users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "password": "SecurePassword123!",
  "name": "New Admin User"
}
```

## Admin API Endpoints

### Dashboard

```http
GET /api/admin/dashboard
Authorization: Bearer <admin-token>
```

Returns platform statistics including total users, subscriptions, and service providers.

### User Management

```http
# Get all users
GET /api/admin/users
Authorization: Bearer <admin-token>

# Update user status
PUT /api/admin/users/:userId/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "isActive": true|false
}
```

### Create Admin User

```http
POST /api/admin/users
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "SecurePassword123!",
  "name": "Admin Name"
}
```

## Security Features

### 1. Role Validation

- All admin endpoints require valid admin role
- JWT tokens include role information
- Role checked on every authenticated request

### 2. Self-Protection

- Admins cannot deactivate their own accounts
- Prevents accidental lockout scenarios

### 3. Password Requirements

Admin passwords must meet strict requirements:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%\*?&)

### 4. Rate Limiting

Admin endpoints inherit the same rate limiting as other authentication endpoints.

## Usage Examples

### 1. Initial Admin Setup

```bash
# Set environment variables (optional)
export ADMIN_EMAIL="admin@yourcompany.com"
export ADMIN_PASSWORD="YourSecurePassword123!"
export ADMIN_NAME="Platform Administrator"

# Create admin user
npm run create-admin
```

### 2. Admin Login

```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@buddypass.com",
    "password": "AdminPass123!"
  }'
```

### 3. Access Admin Dashboard

```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer <admin-token>"
```

### 4. Create Additional Admin

```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@example.com",
    "password": "SecurePassword123!",
    "name": "Second Admin"
  }'
```

## Migration Guide

### Existing Users

- All existing users automatically get `role: "USER"`
- No breaking changes to existing functionality
- Existing authentication continues to work

### Database Migration

The migration has been applied automatically and includes:

- Addition of `UserRole` enum
- Addition of `role` field to `User` table with default value

### Code Changes Required

If you have existing code that uses user objects, no changes are required as the role field is optional in responses for backward compatibility.

## Best Practices

### 1. Admin Account Security

- Use strong passwords for admin accounts
- Regularly rotate admin passwords
- Monitor admin account activity
- Use environment variables for initial admin credentials

### 2. Role Management

- Grant admin access sparingly
- Regular audit of admin users
- Implement admin activity logging (future enhancement)
- Consider multi-factor authentication (future enhancement)

### 3. Development vs Production

- Use different admin credentials for different environments
- Never commit admin credentials to version control
- Use environment-specific configuration

## Future Enhancements

### 1. Additional Roles

- MODERATOR: Limited admin capabilities
- SUPPORT: Customer support access
- ANALYST: Read-only dashboard access

### 2. Permissions System

- Granular permissions within admin role
- Feature-specific access control
- Resource-based permissions

### 3. Admin Activity Logging

- Track all admin actions
- Audit trail for compliance
- Admin action notifications

### 4. Enhanced Security

- Multi-factor authentication for admins
- Session management improvements
- Advanced rate limiting for admin endpoints

## Testing

### Automated Tests

```bash
npm test
```

### Manual Testing

1. Create admin user using script
2. Login as admin and verify role in token
3. Access admin endpoints with admin token
4. Create regular user and verify cannot access admin endpoints
5. Test admin user creation via API

## Troubleshooting

### Common Issues

1. **"Module has no exported member 'UserRole'"**

   - Run `npx prisma generate` to regenerate Prisma client
   - Restart TypeScript server in your IDE

2. **"Admin access required" error**

   - Verify token includes role: "ADMIN"
   - Check token is valid and not expired
   - Ensure user has admin role in database

3. **Admin user creation fails**
   - Check database connection
   - Verify password meets requirements
   - Ensure email is not already in use

### Debug Commands

```bash
# Check Prisma client generation
npx prisma generate

# Verify database schema
npx prisma db push

# Check admin user exists
npx prisma studio
```

## Conclusion

The admin system provides a solid foundation for platform management while maintaining security and extensibility. The role-based approach allows for future expansion and provides clear separation between regular users and platform administrators.
