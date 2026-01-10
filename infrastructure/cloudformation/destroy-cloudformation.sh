#!/bin/bash

set -e

echo "======================================"
echo "AWS Cognito Login - Stack Deletion"
echo "======================================"
echo ""

# Configuration
STACK_NAME="cognito-login-stack"
REGION="${AWS_REGION:-us-east-1}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}WARNING: This will delete all resources including:${NC}"
echo "  - Cognito User Pool and all users"
echo "  - S3 Bucket and all files"
echo "  - CloudFront Distribution"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Deletion cancelled."
    exit 0
fi

# Get bucket name before deleting stack
echo "Retrieving bucket name..."
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "${BUCKET_NAME}" ]; then
    echo "Emptying S3 bucket: ${BUCKET_NAME}"
    aws s3 rm s3://${BUCKET_NAME}/ --recursive --region ${REGION} || true
    echo -e "${GREEN}✓ S3 bucket emptied${NC}"
fi

echo ""
echo "Deleting CloudFormation stack: ${STACK_NAME}"
aws cloudformation delete-stack \
    --stack-name ${STACK_NAME} \
    --region ${REGION}

echo "Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete \
    --stack-name ${STACK_NAME} \
    --region ${REGION}

echo ""
echo -e "${GREEN}✓ Stack deleted successfully${NC}"
echo ""
echo "All resources have been removed."
echo ""
