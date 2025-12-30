# TeleHealth India - Deployment Guide

## Prerequisites

### Required Tools
- AWS CLI v2.x
- Terraform 1.5+
- kubectl 1.28+
- Docker 24+
- Node.js 20+
- Flutter 3.x

### AWS Account Setup
1. Create AWS Account with billing in India
2. Set up IAM user with appropriate permissions
3. Configure AWS CLI:
   ```bash
   aws configure --profile telehealth
   ```

### Domain & SSL
1. Purchase domain from Route53 or transfer existing domain
2. Request SSL certificate from ACM in `ap-south-1` region
3. Verify domain ownership

## Infrastructure Setup

### 1. Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region         = "ap-south-1"
environment        = "production"
db_username        = "admin"
db_password        = "<strong-password>"
redis_auth_token   = "<strong-token>"
EOF

# Plan infrastructure
terraform plan -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

### 2. Configure kubectl

```bash
# Update kubeconfig
aws eks update-kubeconfig \
  --region ap-south-1 \
  --name telehealth-cluster \
  --profile telehealth

# Verify connection
kubectl get nodes
```

### 3. Set up Secrets

```bash
# Create namespace
kubectl create namespace telehealth

# Create secrets
kubectl create secret generic api-secrets \
  --from-literal=JWT_SECRET="your-jwt-secret" \
  --from-literal=RAZORPAY_KEY_ID="rzp_live_xxx" \
  --from-literal=RAZORPAY_KEY_SECRET="xxx" \
  --from-literal=PAYTM_MERCHANT_ID="xxx" \
  --from-literal=PAYTM_MERCHANT_KEY="xxx" \
  --from-literal=CASHFREE_APP_ID="xxx" \
  --from-literal=CASHFREE_SECRET_KEY="xxx" \
  --from-literal=AGORA_APP_ID="xxx" \
  --from-literal=AGORA_APP_CERTIFICATE="xxx" \
  -n telehealth
```

## Database Setup

### 1. Run Migrations

```bash
cd backend/services/auth

# Install dependencies
npm install

# Run migrations
npm run migrate

# Verify
psql -h <rds-endpoint> -U admin -d telehealth -c "\dt"
```

### 2. Seed Initial Data

```bash
# Create super admin
npm run seed:admin

# Create default roles and permissions
npm run seed:rbac
```

## Backend Deployment

### 1. Build Docker Images

```bash
# Build and push API Gateway
cd backend/api-gateway
docker build -t <ecr-repo>/api-gateway:latest .
docker push <ecr-repo>/api-gateway:latest

# Build other services
cd ../services/auth
docker build -t <ecr-repo>/auth-service:latest .
docker push <ecr-repo>/auth-service:latest

# Repeat for all services
```

### 2. Deploy to Kubernetes

```bash
cd infrastructure/k8s

# Deploy services in order
kubectl apply -f namespace.yaml
kubectl apply -f configmaps/
kubectl apply -f secrets/
kubectl apply -f deployments/
kubectl apply -f services/
kubectl apply -f ingress.yaml

# Verify deployments
kubectl get pods -n telehealth
kubectl get services -n telehealth
```

### 3. Configure Ingress & Load Balancer

```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/aws/deploy.yaml

# Configure ALB
kubectl apply -f alb-ingress.yaml

# Get load balancer URL
kubectl get ingress -n telehealth
```

## Mobile App Deployment

### 1. Configure Environment

```bash
cd mobile/patient_app

# Create environment config
cat > lib/core/config/environment.dart <<EOF
class Environment {
  static const String apiBaseUrl = 'https://api.telehealth-india.com';
  static const String agoraAppId = 'your-agora-app-id';
  static const String razorpayKey = 'rzp_live_xxx';
}
EOF
```

### 2. Build Android App

```bash
# Build release APK
flutter build apk --release

# Build App Bundle for Play Store
flutter build appbundle --release

# APK location: build/app/outputs/flutter-apk/app-release.apk
# AAB location: build/app/outputs/bundle/release/app-release.aab
```

### 3. Build iOS App

```bash
# Install pods
cd ios && pod install && cd ..

# Build iOS
flutter build ios --release

# Open in Xcode for signing and upload
open ios/Runner.xcworkspace
```

### 4. Deploy to App Stores

**Google Play Store:**
1. Create app listing
2. Upload AAB bundle
3. Complete content rating questionnaire
4. Submit for review

**Apple App Store:**
1. Create app in App Store Connect
2. Archive and upload via Xcode
3. Complete app information
4. Submit for review

## Monitoring & Observability

### 1. CloudWatch Setup

```bash
# Install CloudWatch Container Insights
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/quickstart/cwagent-fluentd-quickstart.yaml
```

### 2. Configure Alarms

```bash
cd infrastructure/terraform/modules/cloudwatch

# Review and adjust alarm thresholds in alarms.tf
# Apply changes
terraform apply
```

### 3. Set up Sentry (Error Tracking)

```bash
# Add Sentry DSN to secrets
kubectl create secret generic sentry-config \
  --from-literal=SENTRY_DSN="https://xxx@sentry.io/xxx" \
  -n telehealth
```

## Security Configuration

### 1. Enable WAF

```bash
cd infrastructure/terraform/modules/waf
terraform apply
```

### 2. Configure Security Groups

- RDS: Only allow EKS security group
- ElastiCache: Only allow EKS security group
- ALB: Allow 443 from anywhere, 80 redirect to 443

### 3. Set up VPN for Admin Access

```bash
# Create VPN in AWS
aws ec2 create-client-vpn-endpoint \
  --region ap-south-1 \
  --client-cidr-block "10.1.0.0/16" \
  --server-certificate-arn "arn:aws:acm:..." \
  --authentication-options Type=certificate-authentication,MutualAuthentication={ClientRootCertificateChainArn=arn:aws:acm:...}
```

## Compliance Checklist

- [ ] All data stored in `ap-south-1` (Mumbai) region
- [ ] RDS encryption at rest enabled
- [ ] S3 encryption at rest enabled
- [ ] DynamoDB encryption at rest enabled
- [ ] TLS 1.3 for all data in transit
- [ ] Audit logging enabled for all medical record access
- [ ] Automated backups configured (30-day retention)
- [ ] Point-in-time recovery enabled for DynamoDB
- [ ] Multi-AZ deployment for production RDS
- [ ] VPC flow logs enabled
- [ ] CloudTrail enabled for API audit
- [ ] IAM policies follow least privilege
- [ ] No hardcoded credentials in code

## Backup & Disaster Recovery

### 1. Database Backups

- Automated daily RDS snapshots
- 30-day retention period
- Cross-region backup to `ap-south-2` (Hyderabad)

### 2. S3 Versioning

All S3 buckets have versioning enabled with lifecycle policies:
- Current versions: Intelligent-Tiering
- Older versions: Glacier after 90 days
- Permanent deletion after 365 days

### 3. Disaster Recovery Plan

**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 1 hour

Recovery steps:
1. Restore RDS from latest automated snapshot
2. Restore S3 objects if needed
3. Restore DynamoDB from point-in-time recovery
4. Redeploy services from Docker images
5. Verify data integrity

## Production Readiness Checklist

- [ ] Load testing completed (10,000+ concurrent users)
- [ ] Security audit completed
- [ ] Penetration testing completed
- [ ] VAPT (Vulnerability Assessment & Penetration Testing)
- [ ] SSL certificates installed and verified
- [ ] DNS configured with failover
- [ ] CDN configured for static assets
- [ ] Rate limiting configured
- [ ] DDoS protection enabled (AWS Shield)
- [ ] Monitoring dashboards created
- [ ] Alert channels configured (Email, SMS, Slack)
- [ ] On-call rotation established
- [ ] Incident response plan documented
- [ ] Data retention policies implemented
- [ ] GDPR compliance verified
- [ ] Payment gateway webhooks tested
- [ ] Video calling load tested
- [ ] Mobile apps submitted to stores
- [ ] Terms of Service and Privacy Policy published

## Scaling Guidelines

### Auto-scaling Triggers

**Horizontal Pod Autoscaler (HPA):**
- CPU > 70%: Scale up
- Memory > 80%: Scale up
- CPU < 30% for 10 min: Scale down

**EKS Node Autoscaling:**
- Pod pending > 5 min: Add node
- Node utilization < 30%: Remove node

### Database Scaling

**RDS:**
- Read replicas for read-heavy operations
- Vertical scaling during low-traffic windows
- Connection pooling (max 100 connections per service)

**DynamoDB:**
- On-demand billing for variable traffic
- Reserved capacity for predictable workloads

## Support & Maintenance

### Regular Maintenance

**Daily:**
- Check CloudWatch dashboards
- Review error logs
- Monitor payment transactions

**Weekly:**
- Review security alerts
- Check backup completion
- Review capacity utilization

**Monthly:**
- Security patches
- Dependency updates
- Cost optimization review
- Compliance audit

### Emergency Contacts

- DevOps Lead: +91-XXXXXXXXXX
- Security Team: security@telehealth-india.com
- AWS Support: Enterprise Support Plan

## Cost Optimization

**Monthly Cost Estimate (Production):**

- EKS Cluster: $150
- EC2 Instances (5x t3.large): $300
- RDS (db.t3.large Multi-AZ): $200
- ElastiCache (3 nodes): $100
- DynamoDB (on-demand): $150
- S3 Storage: $50
- Data Transfer: $100
- CloudWatch: $50
- Route53: $10

**Total: ~$1,110/month**

**Cost Savings:**
- Use Reserved Instances (40% savings)
- Use Savings Plans (20% savings)
- S3 Intelligent-Tiering
- DynamoDB Auto Scaling
- Right-size instances based on metrics

## Troubleshooting

### Common Issues

**1. Pod CrashLoopBackOff**
```bash
kubectl logs <pod-name> -n telehealth
kubectl describe pod <pod-name> -n telehealth
```

**2. Database Connection Issues**
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx

# Test connectivity
kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql -h <rds-endpoint> -U admin
```

**3. Payment Gateway Failures**
- Check webhook endpoints are accessible
- Verify API keys in secrets
- Review CloudWatch logs for specific errors

**4. Video Call Issues**
- Verify Agora credentials
- Check network policies
- Review WebRTC logs in mobile apps
