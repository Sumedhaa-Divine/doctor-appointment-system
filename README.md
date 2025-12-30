# TeleHealth India - Online Video Consultation Platform

A scalable, India-compliant telemedicine platform for patient-doctor video consultations.

## Architecture Overview

### Mobile Apps (Flutter)
- **Patient App**: Book appointments, video consultations, medical records, payments
- **Doctor App**: Manage appointments, video consultations, prescriptions, earnings
- **Admin App**: RBAC-based administration, analytics, user management

### Backend (Node.js + NestJS Microservices)
- **API Gateway**: Kong/Express Gateway with rate limiting
- **Auth Service**: JWT + RBAC, multi-factor authentication
- **Appointment Service**: Scheduling, calendar management, reminders
- **Consultation Service**: Video session management, WebRTC signaling
- **Payment Service**: Multi-gateway (Razorpay, Paytm, Cashfree)
- **Notification Service**: SMS (MSG91), Email (SES), Push (FCM)
- **Medical Records Service**: Prescriptions, reports, encrypted storage

### Databases (AWS Mumbai Region)
- **PostgreSQL (RDS)**: User data, appointments, transactions, audit logs
- **DynamoDB**: Medical records, chat messages, session data
- **Redis (ElastiCache)**: Caching, session management, real-time presence

### Video Infrastructure
- **Agora SDK**: Low-latency video for India, 10,000+ concurrent support
- **Recording**: S3 encrypted storage with lifecycle policies

### Compliance & Security
- **Data Residency**: All data in AWS Mumbai region
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Audit Logs**: Complete trail of all medical data access
- **RBAC**: Role-based access control for all operations
- **Backup**: Automated daily backups with 30-day retention

### Payment Integration
- **Razorpay**: Primary gateway (UPI, Cards, Wallets, EMI)
- **Paytm**: Secondary gateway for redundancy
- **Cashfree**: Tertiary gateway and payout management
- **Features**: Automatic retries, webhook handling, refunds, settlements

## Tech Stack

### Mobile
- Flutter 3.x
- Provider/Riverpod (State Management)
- Agora Flutter SDK (Video)
- Dio (HTTP Client)
- Hive/Drift (Local DB)
- Firebase Messaging (Push Notifications)

### Backend
- Node.js 20 LTS
- NestJS 10.x
- TypeScript
- PostgreSQL 15
- DynamoDB
- Redis 7.x
- Bull (Job Queue)

### DevOps
- Docker + Kubernetes (EKS)
- Terraform (Infrastructure as Code)
- GitHub Actions (CI/CD)
- CloudWatch (Monitoring)
- Sentry (Error Tracking)

## Getting Started

### Prerequisites
- Flutter SDK 3.x
- Node.js 20+
- Docker & Docker Compose
- AWS Account (Mumbai region)
- Razorpay, Paytm, Cashfree accounts

### Local Development Setup

1. Clone repository
2. Set up backend services (see [backend/README.md](backend/README.md))
3. Set up Flutter apps (see [mobile/README.md](mobile/README.md))
4. Configure environment variables
5. Run with Docker Compose

## Project Structure

```
telehealth-india/
├── mobile/
│   ├── patient_app/          # Flutter patient mobile app
│   ├── doctor_app/           # Flutter doctor mobile app
│   └── admin_app/            # Flutter admin mobile app
├── backend/
│   ├── api-gateway/          # API Gateway service
│   └── services/
│       ├── auth/             # Authentication & RBAC
│       ├── appointment/      # Appointment scheduling
│       ├── consultation/     # Video consultation logic
│       ├── payment/          # Multi-payment gateway
│       ├── notification/     # SMS, Email, Push
│       └── medical-records/  # Prescriptions & records
├── infrastructure/
│   ├── terraform/            # AWS infrastructure
│   ├── docker/               # Docker configurations
│   └── k8s/                  # Kubernetes manifests
└── docs/                     # Documentation
```

## Compliance & Regulations

- Data stored in AWS Mumbai region (India data residency)
- Patient data encryption (HIPAA-inspired)
- Audit logging for all medical record access
- Regular security audits and penetration testing
- GDPR-compliant data deletion

## License

Proprietary - All Rights Reserved
