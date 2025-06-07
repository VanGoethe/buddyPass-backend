# BuddyPass Backend

A robust Node.js backend API for BuddyPass with comprehensive user authentication system.

## Features

- 🔐 **Dual Authentication**: Email/password and Google OAuth
- 🛡️ **JWT Security**: Access and refresh token system
- 🔒 **Password Security**: Bcrypt hashing with salt rounds
- ⚡ **Rate Limiting**: Protection against brute force attacks
- ✅ **Input Validation**: Comprehensive request validation
- 🗄️ **Database**: PostgreSQL with Prisma ORM
- 🚀 **TypeScript**: Full type safety
- 👑 **Admin System**: Role-based access control for platform management

## Admin System

BuddyPass includes a comprehensive admin system for platform management:

- **Role-Based Access**: Separate USER and ADMIN roles
- **Admin Dashboard**: Platform statistics and overview
- **User Management**: View and manage all users
- **Secure Admin Creation**: CLI script and API endpoints

### Create Initial Admin

```bash
npm run create-admin
```

Use environment variables to customize:

```bash
export ADMIN_EMAIL="admin@yourcompany.com"
export ADMIN_PASSWORD="YourSecurePassword123!"
export ADMIN_NAME="Platform Administrator"
npm run create-admin
```

For detailed admin system documentation, see [ADMIN_SYSTEM_IMPLEMENTATION.md](./ADMIN_SYSTEM_IMPLEMENTATION.md).

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials (for OAuth login)

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd buddypass-backend
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/buddypass_db"
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

4. Set up the database

```bash
npm run migrate
npm run generate
```

5. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe" // optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### Login User

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Logout

```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### Get Profile

```http
GET /auth/profile
Authorization: Bearer your_access_token
```

#### Update Profile

```http
PUT /auth/profile
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "name": "Updated Name"
}
```

#### Change Password

```http
PUT /auth/change-password
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "currentPassword": "current_password",
  "newPassword": "NewSecurePass123!"
}
```

### Google OAuth

#### Initiate Google OAuth

```http
GET /auth/google
```

Redirects to Google OAuth consent screen.

#### Google OAuth Callback

```http
GET /auth/google/callback
```

Handles the callback from Google OAuth.

## Security Features

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Rate Limiting

- Login: 5 attempts per 15 minutes
- Registration: 3 attempts per hour
- General auth endpoints: Configurable limits

### JWT Tokens

- **Access Token**: Short-lived (15 minutes)
- **Refresh Token**: Long-lived (7 days)
- Automatic cleanup of expired tokens

## Database Schema

### User Model

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String?
  password    String?  // Optional for OAuth users
  avatar      String?
  googleId    String?  @unique
  provider    String?  // 'local' | 'google'
  isVerified  Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  lastLoginAt DateTime?
  refreshTokens RefreshToken[]
}
```

### RefreshToken Model

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run migrate      # Run database migrations
npm run generate     # Generate Prisma client
npm test             # Run tests
```

### Project Structure

```
src/
├── config/          # Configuration files
│   ├── auth.ts      # Auth configuration
│   └── passport.ts  # Passport strategies
├── controllers/     # Route controllers
│   └── authController.ts
├── middleware/      # Express middleware
│   ├── auth.ts      # Auth middleware
│   └── errorHandler.ts
├── routes/          # API routes
│   ├── auth.ts      # Auth routes
│   └── index.ts     # Main router
├── services/        # Business logic
│   └── authService.ts
├── utils/           # Utilities
│   └── validation.ts
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
