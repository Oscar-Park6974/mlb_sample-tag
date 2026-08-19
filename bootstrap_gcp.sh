#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:?Usage: $0 PROJECT_ID}"
REGION="${REGION:-asia-southeast1}"
REPOSITORY="${REPOSITORY:-mlb-apps}"


gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com iamcredentials.googleapis.com sts.googleapis.com

gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$REPOSITORY" --repository-format=docker --location="$REGION"

echo "Base Google Cloud services and Artifact Registry are ready."
echo "Next: configure GitHub OIDC Workload Identity Federation and repository secrets."
