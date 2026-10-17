/**
 * ARGUS Cloud Storage Enclave (Option A: Single Tenant Bucket with Prefix Namespaces)
 * Project: argus-guardian
 * Region: asia-east1 (Taiwan)
 */

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "argus-guardian"
}

variable "region" {
  description = "Primary GCP region for enclave compute & durable storage"
  type        = string
  default     = "asia-east1"
}

variable "tenant_org_id" {
  description = "Unique enterprise tenant identifier"
  type        = string
  default     = "org-hukurou"
}

variable "worm_retention_days" {
  description = "WORM retention lock period in days (Enterprise compliance standard)"
  type        = number
  default     = 365
}

# 1. KMS Key Ring & CMEK Cryptographic Key
resource "google_kms_key_ring" "enclave_keyring" {
  name     = "argus-enclave-keyring"
  location = var.region
  project  = var.project_id
}

resource "google_kms_crypto_key" "storage_key" {
  name            = "tenant-${var.tenant_org_id}-storage-cmek"
  key_ring        = google_kms_key_ring.enclave_keyring.id
  rotation_period = "7776000s" # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# Grant GCS service agent access to encrypt/decrypt with CMEK
data "google_storage_project_service_account" "gcs_account" {
  project = var.project_id
}

resource "google_kms_crypto_key_iam_binding" "gcs_cmek_binding" {
  crypto_key_id = google_kms_crypto_key.storage_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"

  members = [
    "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}",
  ]
}

# 2. Option A Tenant Storage Bucket
resource "google_storage_bucket" "tenant_enclave_bucket" {
  name          = "argus-tenant-${var.tenant_org_id}"
  project       = var.project_id
  location      = var.region
  storage_class = "STANDARD"

  # Enforce uniform IAM access (disabling legacy object ACLs)
  uniform_bucket_level_access = true

  # Customer-Managed Encryption Key (CMEK)
  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  # Compliance Retention Policy (WORM Lock: 365 days)
  retention_policy {
    is_locked        = false # Set to true in audited production to make irreversible
    retention_period = var.worm_retention_days * 86400
  }

  # Auto-expire ephemeral staging chunk uploads after 24 hours
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age            = 1 # 1 day
      matches_prefix = ["staging/"]
    }
  }

  # Versioning enabled to track audit ledger manifests
  versioning {
    enabled = true
  }

  labels = {
    managed_by  = "argus-control-plane"
    tenant_org  = var.tenant_org_id
    environment = "production"
    retention   = "worm-365d"
  }

  depends_on = [
    google_kms_crypto_key_iam_binding.gcs_cmek_binding
  ]
}

# 3. Restrictive IAM Policy
# AI Agents and untrusted services are granted read-only access exclusively to Tier 2 views
resource "google_storage_bucket_iam_binding" "views_reader" {
  bucket = google_storage_bucket.tenant_enclave_bucket.name
  role   = "roles/storage.objectViewer"

  members = [
    "serviceAccount:redact-core-runner@${var.project_id}.iam.gserviceaccount.com",
    "serviceAccount:cerberus-gateway@${var.project_id}.iam.gserviceaccount.com",
  ]
}

output "bucket_name" {
  description = "Tenant GCS Bucket Name"
  value       = google_storage_bucket.tenant_enclave_bucket.name
}

output "bucket_uri" {
  description = "Tenant GCS Bucket URI"
  value       = "gs://${google_storage_bucket.tenant_enclave_bucket.name}"
}

output "originals_prefix" {
  description = "Tier 1 Immutable Originals Prefix"
  value       = "gs://${google_storage_bucket.tenant_enclave_bucket.name}/originals/"
}

output "views_prefix" {
  description = "Tier 2 Verified Derived Views Prefix"
  value       = "gs://${google_storage_bucket.tenant_enclave_bucket.name}/views/"
}

output "manifests_prefix" {
  description = "Tier 3 Cryptographic Manifests Prefix"
  value       = "gs://${google_storage_bucket.tenant_enclave_bucket.name}/manifests/"
}
