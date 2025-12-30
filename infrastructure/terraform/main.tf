terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "telehealth-india-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "telehealth-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "TeleHealth India"
      ManagedBy   = "Terraform"
      Compliance  = "India Data Residency"
    }
  }
}

# VPC Configuration
module "vpc" {
  source = "./modules/vpc"

  environment         = var.environment
  vpc_cidr            = var.vpc_cidr
  availability_zones  = var.availability_zones
  private_subnets     = var.private_subnets
  public_subnets      = var.public_subnets
  enable_nat_gateway  = true
  single_nat_gateway  = var.environment != "production"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# RDS PostgreSQL - India Compliant
module "rds" {
  source = "./modules/rds"

  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnets
  instance_class             = var.rds_instance_class
  allocated_storage          = var.rds_allocated_storage
  database_name              = "telehealth"
  master_username            = var.db_username
  master_password            = var.db_password
  backup_retention_period    = 30
  storage_encrypted          = true
  kms_key_id                 = module.kms.rds_key_id
  multi_az                   = var.environment == "production"
  deletion_protection        = var.environment == "production"
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
}

# DynamoDB - Medical Records Storage
module "dynamodb" {
  source = "./modules/dynamodb"

  environment = var.environment

  tables = [
    {
      name           = "medical-records"
      hash_key       = "patientId"
      range_key      = "recordId"
      billing_mode   = "PAY_PER_REQUEST"
      enable_encryption = true
      kms_key_id     = module.kms.dynamodb_key_id
      enable_point_in_time_recovery = true
    },
    {
      name           = "consultations"
      hash_key       = "consultationId"
      range_key      = "timestamp"
      billing_mode   = "PAY_PER_REQUEST"
      enable_encryption = true
      kms_key_id     = module.kms.dynamodb_key_id
      enable_point_in_time_recovery = true
    },
    {
      name           = "chat-messages"
      hash_key       = "conversationId"
      range_key      = "messageId"
      billing_mode   = "PAY_PER_REQUEST"
      enable_encryption = true
      kms_key_id     = module.kms.dynamodb_key_id
      enable_point_in_time_recovery = true
    }
  ]
}

# ElastiCache Redis - Session & Caching
module "elasticache" {
  source = "./modules/elasticache"

  environment            = var.environment
  vpc_id                 = module.vpc.vpc_id
  subnet_ids             = module.vpc.private_subnets
  node_type              = var.redis_node_type
  num_cache_nodes        = var.environment == "production" ? 3 : 1
  engine_version         = "7.0"
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token             = var.redis_auth_token
}

# EKS Cluster - Kubernetes
module "eks" {
  source = "./modules/eks"

  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnets
  cluster_version    = "1.28"

  node_groups = {
    general = {
      desired_capacity = var.environment == "production" ? 3 : 2
      max_capacity     = var.environment == "production" ? 10 : 3
      min_capacity     = var.environment == "production" ? 3 : 1
      instance_types   = ["t3.large"]
      disk_size        = 50
    }
    video = {
      desired_capacity = var.environment == "production" ? 2 : 1
      max_capacity     = var.environment == "production" ? 5 : 2
      min_capacity     = var.environment == "production" ? 2 : 1
      instance_types   = ["c5.xlarge"]  # Compute optimized for video
      disk_size        = 50
    }
  }
}

# S3 Buckets - Medical Records & Video Storage
module "s3" {
  source = "./modules/s3"

  environment = var.environment

  buckets = [
    {
      name                = "telehealth-medical-records"
      versioning_enabled  = true
      encryption_enabled  = true
      kms_key_id          = module.kms.s3_key_id
      lifecycle_rules     = true
      intelligent_tiering = true
    },
    {
      name                = "telehealth-video-recordings"
      versioning_enabled  = true
      encryption_enabled  = true
      kms_key_id          = module.kms.s3_key_id
      lifecycle_rules     = true
      glacier_transition  = 90  # Move to Glacier after 90 days
    },
    {
      name                = "telehealth-prescriptions"
      versioning_enabled  = true
      encryption_enabled  = true
      kms_key_id          = module.kms.s3_key_id
      lifecycle_rules     = false
    },
    {
      name                = "telehealth-backups"
      versioning_enabled  = true
      encryption_enabled  = true
      kms_key_id          = module.kms.s3_key_id
      lifecycle_rules     = true
    }
  ]
}

# KMS Keys - Encryption
module "kms" {
  source = "./modules/kms"

  environment = var.environment

  keys = {
    rds = {
      description = "KMS key for RDS encryption"
      rotation    = true
    }
    dynamodb = {
      description = "KMS key for DynamoDB encryption"
      rotation    = true
    }
    s3 = {
      description = "KMS key for S3 encryption"
      rotation    = true
    }
    secrets = {
      description = "KMS key for Secrets Manager"
      rotation    = true
    }
  }
}

# CloudWatch - Monitoring & Logging
module "cloudwatch" {
  source = "./modules/cloudwatch"

  environment = var.environment

  log_groups = [
    {
      name              = "/aws/eks/telehealth-cluster"
      retention_in_days = 30
    },
    {
      name              = "/aws/rds/telehealth"
      retention_in_days = 30
    },
    {
      name              = "/aws/lambda/telehealth"
      retention_in_days = 14
    }
  ]

  alarms = {
    rds_cpu = {
      metric_name         = "CPUUtilization"
      threshold           = 80
      evaluation_periods  = 2
      alarm_description   = "RDS CPU utilization is too high"
    }
    rds_connections = {
      metric_name         = "DatabaseConnections"
      threshold           = 100
      evaluation_periods  = 1
      alarm_description   = "Too many RDS connections"
    }
  }
}

# WAF - Web Application Firewall
module "waf" {
  source = "./modules/waf"

  environment = var.environment

  rules = [
    {
      name     = "rate-limit"
      priority = 1
      type     = "RATE_BASED"
      limit    = 2000
    },
    {
      name     = "geo-blocking"
      priority = 2
      type     = "GEO_MATCH"
      countries = ["IN"]  # Only allow India traffic
      action   = "ALLOW"
    },
    {
      name     = "sql-injection"
      priority = 3
      type     = "SQL_INJECTION"
      action   = "BLOCK"
    },
    {
      name     = "xss"
      priority = 4
      type     = "XSS"
      action   = "BLOCK"
    }
  ]
}

# Secrets Manager - Secure credential storage
module "secrets_manager" {
  source = "./modules/secrets_manager"

  environment = var.environment
  kms_key_id  = module.kms.secrets_key_id

  secrets = [
    {
      name = "telehealth/db/master"
      description = "Database master credentials"
    },
    {
      name = "telehealth/razorpay/keys"
      description = "Razorpay API keys"
    },
    {
      name = "telehealth/paytm/keys"
      description = "Paytm API keys"
    },
    {
      name = "telehealth/cashfree/keys"
      description = "Cashfree API keys"
    },
    {
      name = "telehealth/jwt/secret"
      description = "JWT signing secret"
    },
    {
      name = "telehealth/agora/credentials"
      description = "Agora video API credentials"
    }
  ]
}

# SNS Topics - Notifications
module "sns" {
  source = "./modules/sns"

  environment = var.environment

  topics = [
    {
      name         = "telehealth-alarms"
      display_name = "TeleHealth System Alarms"
    },
    {
      name         = "telehealth-notifications"
      display_name = "TeleHealth User Notifications"
    }
  ]
}
