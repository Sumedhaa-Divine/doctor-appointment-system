# TeleHealth India - Getting Started Guide

## Quick Start

This guide will help you set up the TeleHealth India platform for local development or production deployment.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Backend Services Setup](#backend-services-setup)
3. [Mobile App Setup](#mobile-app-setup)
4. [Third-Party Integrations](#third-party-integrations)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)

## Local Development Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **Flutter** 3.x ([Install Guide](https://docs.flutter.dev/get-started/install))
- **Docker** 24+ ([Download](https://www.docker.com/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Redis** 7+ ([Download](https://redis.io/download))
- **Git** ([Download](https://git-scm.com/downloads))

### Clone Repository

```bash
git clone https://github.com/your-org/telehealth-india.git
cd telehealth-india
```

### Environment Setup

```bash
# Copy environment templates
cp backend/api-gateway/.env.example backend/api-gateway/.env.development
cp backend/services/auth/.env.example backend/services/auth/.env.development

# Edit environment files with your local configuration
```

### Database Setup

```bash
# Create PostgreSQL database
createdb telehealth_dev

# Run migrations
cd backend/services/auth
npm install
npm run migrate

# Seed development data
npm run seed:dev
```

### Start Local Services with Docker Compose

```bash
# Start all backend services
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose ps
```

This will start:
- PostgreSQL (port 5432)
- Redis (port 6379)
- API Gateway (port 3000)
- Auth Service (port 3001)
- Appointment Service (port 3002)
- Consultation Service (port 3003)
- Payment Service (port 3004)
- Notification Service (port 3005)
- Medical Records Service (port 3006)

### Verify Backend

```bash
# Check API Gateway health
curl http://localhost:3000/health

# Test login endpoint
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Backend Services Setup

### Manual Setup (without Docker)

If you prefer to run services individually:

#### 1. API Gateway

```bash
cd backend/api-gateway
npm install
npm run start:dev
```

#### 2. Auth Service

```bash
cd backend/services/auth
npm install
npm run start:dev
```

#### 3. Other Services

Repeat for each service in `backend/services/`:
- appointment
- consultation
- payment
- notification
- medical-records

### Environment Variables

Each service requires the following environment variables:

**backend/api-gateway/.env.development:**
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
APPOINTMENT_SERVICE_URL=http://localhost:3002
CONSULTATION_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
MEDICAL_RECORDS_SERVICE_URL=http://localhost:3006

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080
```

**backend/services/auth/.env.development:**
```env
NODE_ENV=development
PORT=3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=telehealth_dev

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

**backend/services/payment/.env.development:**
```env
NODE_ENV=development
PORT=3004

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=telehealth_dev

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx

# Paytm
PAYTM_MERCHANT_ID=xxx
PAYTM_MERCHANT_KEY=xxx
PAYTM_WEBSITE=WEBSTAGING
PAYTM_CALLBACK_URL=http://localhost:3000/api/v1/payments/paytm/callback

# Cashfree
CASHFREE_APP_ID=xxx
CASHFREE_SECRET_KEY=xxx
CASHFREE_BASE_URL=https://test.cashfree.com
CASHFREE_RETURN_URL=http://localhost:3000/api/v1/payments/cashfree/return
```

## Mobile App Setup

### Flutter Patient App

```bash
cd mobile/patient_app

# Install dependencies
flutter pub get

# Run code generation
flutter pub run build_runner build --delete-conflicting-outputs

# Create environment config
cat > lib/core/config/environment.dart <<EOF
class Environment {
  static const String apiBaseUrl = 'http://localhost:3000/api/v1';
  static const String agoraAppId = 'your-agora-app-id';
  static const String razorpayKey = 'rzp_test_xxx';
}
EOF

# Run on Android emulator
flutter run

# Or run on iOS simulator
flutter run -d ios
```

### Flutter Doctor App

```bash
cd mobile/doctor_app

# Install dependencies
flutter pub get

# Run code generation
flutter pub run build_runner build --delete-conflicting-outputs

# Run app
flutter run
```

### Flutter Admin App

```bash
cd mobile/admin_app

# Install dependencies
flutter pub get

# Run code generation
flutter pub run build_runner build --delete-conflicting-outputs

# Run app
flutter run
```

## Third-Party Integrations

### 1. Agora (Video Consultation)

1. Sign up at [Agora.io](https://www.agora.io/)
2. Create a project
3. Get App ID and App Certificate
4. Add to environment:
   ```env
   AGORA_APP_ID=your-app-id
   AGORA_APP_CERTIFICATE=your-certificate
   ```

### 2. Razorpay (Payment Gateway)

1. Sign up at [Razorpay](https://razorpay.com/)
2. Generate test API keys
3. Add to environment:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxx
   RAZORPAY_KEY_SECRET=xxx
   ```
4. Set up webhooks:
   - URL: `https://your-domain.com/api/v1/webhooks/payment/razorpay`
   - Events: `payment.captured`, `payment.failed`, `refund.created`

### 3. Paytm

1. Sign up at [Paytm Developer](https://developer.paytm.com/)
2. Get Merchant ID and Merchant Key
3. Add to environment
4. Configure callback URLs

### 4. Cashfree

1. Sign up at [Cashfree](https://www.cashfree.com/)
2. Get App ID and Secret Key
3. Add to environment
4. Configure webhook URLs

### 5. Firebase (Push Notifications)

1. Create Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Add Android and iOS apps
3. Download `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)
4. Place in respective directories:
   - Android: `mobile/patient_app/android/app/google-services.json`
   - iOS: `mobile/patient_app/ios/Runner/GoogleService-Info.plist`
5. Get FCM Server Key and add to backend:
   ```env
   FCM_SERVER_KEY=xxx
   ```

### 6. AWS Services (Production Only)

For production deployment, you'll need:
- AWS Account
- RDS PostgreSQL instance
- DynamoDB tables
- ElastiCache Redis cluster
- S3 buckets
- CloudWatch
- SES (Email)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed setup.

### 7. SMS Gateway (MSG91 or Twilio)

**MSG91 (Recommended for India):**
```env
MSG91_AUTH_KEY=xxx
MSG91_SENDER_ID=TELEHLT
MSG91_ROUTE=4
```

**Or Twilio:**
```env
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```

## Testing

### Backend Testing

```bash
# Run unit tests
cd backend/services/auth
npm test

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:cov
```

### Mobile App Testing

```bash
cd mobile/patient_app

# Run unit tests
flutter test

# Run widget tests
flutter test test/widgets/

# Run integration tests
flutter drive --target=test_driver/app.dart
```

### End-to-End Testing

```bash
# Install dependencies
npm install -g @playwright/test

# Run E2E tests
cd tests/e2e
npx playwright test
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/appointment-reminders
```

### 2. Make Changes

Follow coding standards:
- Backend: ESLint + Prettier
- Mobile: Dart analyzer + dartfmt

### 3. Run Tests

```bash
# Backend
npm test

# Mobile
flutter test
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add appointment reminders"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `test:` - Tests

### 5. Push and Create PR

```bash
git push origin feature/appointment-reminders
```

## Debugging

### Backend Debugging (VS Code)

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Auth Service",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:dev"],
      "cwd": "${workspaceFolder}/backend/services/auth",
      "console": "integratedTerminal"
    }
  ]
}
```

### Mobile Debugging

```bash
# Enable Flutter DevTools
flutter pub global activate devtools

# Run DevTools
flutter pub global run devtools
```

### Logs

**Backend Logs:**
```bash
# View real-time logs
docker-compose logs -f api-gateway

# View specific service logs
docker-compose logs -f auth-service
```

**Database Logs:**
```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d telehealth_dev

# View tables
\dt

# View specific table
SELECT * FROM users LIMIT 10;
```

## Common Issues

### Issue: Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Issue: Database connection failed

```bash
# Check if PostgreSQL is running
pg_isready

# Restart PostgreSQL
brew services restart postgresql@15  # macOS
sudo systemctl restart postgresql    # Linux
```

### Issue: Flutter build fails

```bash
# Clean build
flutter clean

# Get dependencies
flutter pub get

# Rebuild
flutter run
```

## Next Steps

1. Read [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
2. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
3. Review [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines

## Support

- **Technical Issues:** Create an issue on GitHub
- **Security Issues:** Email security@telehealth-india.com
- **Questions:** Join our Slack channel

## License

Proprietary - All Rights Reserved
