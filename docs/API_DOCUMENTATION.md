# TeleHealth India - API Documentation

Base URL: `https://api.telehealth-india.com/api/v1`

## Authentication

All API requests require authentication using JWT Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### Register User

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "patient@example.com",
  "phoneNumber": "+919876543210",
  "password": "SecurePass123!",
  "firstName": "Rahul",
  "lastName": "Sharma",
  "role": "PATIENT"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "patient@example.com",
    "firstName": "Rahul",
    "lastName": "Sharma",
    "role": "PATIENT",
    "status": "PENDING_VERIFICATION"
  },
  "verificationToken": "jwt_token",
  "message": "User registered successfully"
}
```

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "patient@example.com",
  "password": "SecurePass123!",
  "twoFactorCode": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "patient@example.com",
    "firstName": "Rahul",
    "role": "PATIENT"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### Enable 2FA

```http
POST /auth/2fa/enable
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "secret": "BASE32_SECRET",
  "otpauth": "otpauth://totp/TeleHealth...",
  "qrCode": "data:image/png;base64,..."
}
```

## Appointment Endpoints

### Get Available Slots

```http
GET /appointments/slots?doctorId=<uuid>&date=2025-01-15
```

**Response:**
```json
{
  "date": "2025-01-15",
  "slots": [
    {
      "time": "09:00",
      "available": true,
      "duration": 30
    },
    {
      "time": "09:30",
      "available": false,
      "duration": 30
    }
  ]
}
```

### Book Appointment

```http
POST /appointments
```

**Request Body:**
```json
{
  "doctorId": "uuid",
  "date": "2025-01-15",
  "time": "09:00",
  "duration": 30,
  "consultationType": "VIDEO",
  "symptoms": "Fever and cough for 3 days",
  "notes": "Patient has history of asthma"
}
```

**Response:**
```json
{
  "id": "uuid",
  "appointmentNumber": "APT-2025-001234",
  "doctorId": "uuid",
  "patientId": "uuid",
  "date": "2025-01-15",
  "time": "09:00",
  "status": "CONFIRMED",
  "consultationFee": 500,
  "paymentRequired": true
}
```

### Get My Appointments

```http
GET /appointments/my?status=CONFIRMED&page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "appointmentNumber": "APT-2025-001234",
      "doctor": {
        "id": "uuid",
        "name": "Dr. Priya Verma",
        "specialization": "General Physician",
        "photo": "https://..."
      },
      "date": "2025-01-15",
      "time": "09:00",
      "status": "CONFIRMED"
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

### Cancel Appointment

```http
DELETE /appointments/:id
```

**Response:**
```json
{
  "message": "Appointment cancelled successfully",
  "refundAmount": 500,
  "refundStatus": "PROCESSING"
}
```

## Payment Endpoints

### Create Payment Order

```http
POST /payments/create-order
```

**Request Body:**
```json
{
  "appointmentId": "uuid",
  "amount": 500,
  "currency": "INR",
  "preferredGateway": "RAZORPAY"
}
```

**Response:**
```json
{
  "gateway": "RAZORPAY",
  "orderId": "order_xyz123",
  "amount": 50000,
  "currency": "INR",
  "key": "rzp_live_xxx"
}
```

### Verify Payment

```http
POST /payments/verify
```

**Request Body:**
```json
{
  "orderId": "order_xyz123",
  "paymentId": "pay_abc456",
  "signature": "signature_string",
  "gateway": "RAZORPAY"
}
```

**Response:**
```json
{
  "verified": true,
  "paymentStatus": "SUCCESS",
  "appointmentId": "uuid",
  "receipt": {
    "id": "uuid",
    "amount": 500,
    "date": "2025-01-10T10:30:00Z",
    "downloadUrl": "https://..."
  }
}
```

### Payment History

```http
GET /payments/history?page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "appointmentNumber": "APT-2025-001234",
      "amount": 500,
      "currency": "INR",
      "gateway": "RAZORPAY",
      "status": "SUCCESS",
      "date": "2025-01-10T10:30:00Z"
    }
  ],
  "meta": {
    "total": 20,
    "page": 1,
    "limit": 10
  }
}
```

## Consultation Endpoints

### Start Consultation

```http
POST /consultations/:appointmentId/start
```

**Response:**
```json
{
  "consultationId": "uuid",
  "agoraToken": "agora_temp_token",
  "channelName": "uuid",
  "uid": 12345,
  "expiresAt": "2025-01-15T10:00:00Z"
}
```

### End Consultation

```http
POST /consultations/:id/end
```

**Request Body:**
```json
{
  "duration": 25,
  "notes": "Patient consultation completed",
  "prescriptionRequired": true
}
```

**Response:**
```json
{
  "consultationId": "uuid",
  "duration": 25,
  "recordingUrl": "https://s3...",
  "status": "COMPLETED"
}
```

### Get Consultation History

```http
GET /consultations/history?page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "appointmentId": "uuid",
      "doctor": {
        "name": "Dr. Priya Verma",
        "specialization": "General Physician"
      },
      "date": "2025-01-10",
      "duration": 25,
      "prescription": {
        "id": "uuid",
        "downloadUrl": "https://..."
      }
    }
  ]
}
```

## Medical Records Endpoints

### Upload Medical Record

```http
POST /medical-records
Content-Type: multipart/form-data
```

**Form Data:**
```
file: <file>
type: LAB_REPORT | PRESCRIPTION | XRAY | MRI | OTHER
title: Blood Test Report
description: Routine checkup
date: 2025-01-10
```

**Response:**
```json
{
  "id": "uuid",
  "type": "LAB_REPORT",
  "title": "Blood Test Report",
  "fileUrl": "https://s3...",
  "uploadedAt": "2025-01-10T14:30:00Z"
}
```

### Get My Records

```http
GET /medical-records?type=LAB_REPORT&page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "LAB_REPORT",
      "title": "Blood Test Report",
      "fileUrl": "https://s3...",
      "uploadedAt": "2025-01-10T14:30:00Z",
      "uploadedBy": "PATIENT"
    }
  ]
}
```

### Share Record with Doctor

```http
POST /medical-records/:id/share
```

**Request Body:**
```json
{
  "doctorId": "uuid",
  "expiresIn": 86400
}
```

**Response:**
```json
{
  "shareLink": "https://...",
  "expiresAt": "2025-01-11T14:30:00Z"
}
```

## Doctor Endpoints (Doctor Role Required)

### Get My Schedule

```http
GET /doctors/schedule?date=2025-01-15
```

**Response:**
```json
{
  "date": "2025-01-15",
  "appointments": [
    {
      "id": "uuid",
      "time": "09:00",
      "patient": {
        "name": "Rahul Sharma",
        "age": 32,
        "gender": "MALE"
      },
      "symptoms": "Fever and cough",
      "status": "CONFIRMED"
    }
  ]
}
```

### Update Availability

```http
PUT /doctors/availability
```

**Request Body:**
```json
{
  "weeklySchedule": {
    "MONDAY": {
      "available": true,
      "slots": [
        { "start": "09:00", "end": "12:00" },
        { "start": "14:00", "end": "18:00" }
      ]
    },
    "TUESDAY": {
      "available": true,
      "slots": [
        { "start": "09:00", "end": "12:00" }
      ]
    }
  },
  "exceptions": [
    {
      "date": "2025-01-20",
      "available": false,
      "reason": "Personal leave"
    }
  ]
}
```

### Create Prescription

```http
POST /prescriptions
```

**Request Body:**
```json
{
  "appointmentId": "uuid",
  "patientId": "uuid",
  "diagnosis": "Upper Respiratory Tract Infection",
  "medications": [
    {
      "name": "Paracetamol 500mg",
      "dosage": "1 tablet",
      "frequency": "3 times daily",
      "duration": "5 days",
      "instructions": "Take after meals"
    }
  ],
  "labTests": [
    "Complete Blood Count",
    "CRP Test"
  ],
  "notes": "Rest and increase fluid intake",
  "followUp": {
    "required": true,
    "afterDays": 7
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "prescriptionNumber": "RX-2025-001234",
  "downloadUrl": "https://...",
  "createdAt": "2025-01-15T09:30:00Z"
}
```

## Admin Endpoints (Admin/Super Admin Role Required)

### Get Dashboard Stats

```http
GET /admin/dashboard/stats
```

**Response:**
```json
{
  "overview": {
    "totalUsers": 10500,
    "totalDoctors": 250,
    "totalPatients": 10200,
    "activeConsultations": 45
  },
  "today": {
    "appointments": 230,
    "consultations": 180,
    "revenue": 125000
  },
  "monthToDate": {
    "appointments": 4500,
    "consultations": 3800,
    "revenue": 2250000
  }
}
```

### Manage Users

```http
GET /admin/users?role=DOCTOR&status=ACTIVE&page=1&limit=20
```

```http
PATCH /admin/users/:id/status
```

**Request Body:**
```json
{
  "status": "SUSPENDED",
  "reason": "Violation of terms"
}
```

### Assign Roles & Permissions

```http
POST /admin/users/:id/roles
```

**Request Body:**
```json
{
  "role": "ADMIN",
  "permissions": [
    "users.read",
    "users.update",
    "appointments.read",
    "reports.read"
  ]
}
```

## Notification Endpoints

### Get Notifications

```http
GET /notifications?unreadOnly=true&page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "APPOINTMENT_REMINDER",
      "title": "Upcoming Appointment",
      "message": "You have an appointment with Dr. Priya Verma tomorrow at 9:00 AM",
      "read": false,
      "createdAt": "2025-01-14T18:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

### Mark as Read

```http
PATCH /notifications/:id/read
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Missing or invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `CONFLICT` (409): Resource already exists
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error

## Rate Limiting

- 100 requests per minute per user
- 2000 requests per minute per IP (global)

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705308000
```

## Webhooks

### Payment Webhook

```http
POST /webhooks/payment/:gateway
```

Razorpay webhook signature verification required.

### Video Recording Webhook

```http
POST /webhooks/video/recording-complete
```

Agora recording completion webhook.

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering & Sorting

**Filtering:**
```
GET /appointments?status=CONFIRMED&date_gte=2025-01-01
```

**Sorting:**
```
GET /appointments?sort=-createdAt,status
```

(Prefix with `-` for descending order)
