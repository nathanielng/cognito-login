#!/bin/bash

set -e

echo "======================================"
echo "AWS Cognito Login - CloudFormation Deployment"
echo "======================================"
echo ""

# Configuration
STACK_NAME="cognito-login-stack"
TEMPLATE_FILE="infrastructure/cloudformation/cognito-auth-stack.yaml"
REGION="${AWS_REGION:-us-east-1}"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1: Validating CloudFormation template...${NC}"
aws cloudformation validate-template \
    --template-body file://${TEMPLATE_FILE} \
    --region ${REGION} > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Template is valid${NC}"
else
    echo -e "${RED}✗ Template validation failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Deploying CloudFormation stack...${NC}"
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${REGION}"
echo ""

# Check if stack exists
if aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${REGION} 2>/dev/null; then
    echo "Stack exists. Updating..."
    CHANGE_SET_NAME="${STACK_NAME}-changeset-$(date +%s)"

    aws cloudformation create-change-set \
        --stack-name ${STACK_NAME} \
        --change-set-name ${CHANGE_SET_NAME} \
        --template-body file://${TEMPLATE_FILE} \
        --region ${REGION} \
        --capabilities CAPABILITY_IAM

    echo "Waiting for change set to be created..."
    aws cloudformation wait change-set-create-complete \
        --stack-name ${STACK_NAME} \
        --change-set-name ${CHANGE_SET_NAME} \
        --region ${REGION}

    echo "Executing change set..."
    aws cloudformation execute-change-set \
        --stack-name ${STACK_NAME} \
        --change-set-name ${CHANGE_SET_NAME} \
        --region ${REGION}

    echo "Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete \
        --stack-name ${STACK_NAME} \
        --region ${REGION}
else
    echo "Creating new stack..."
    aws cloudformation create-stack \
        --stack-name ${STACK_NAME} \
        --template-body file://${TEMPLATE_FILE} \
        --region ${REGION} \
        --capabilities CAPABILITY_IAM

    echo "Waiting for stack creation to complete (this may take 10-15 minutes)..."
    aws cloudformation wait stack-create-complete \
        --stack-name ${STACK_NAME} \
        --region ${REGION}
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Stack deployed successfully${NC}"
else
    echo -e "${RED}✗ Stack deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Retrieving stack outputs...${NC}"

# Get stack outputs
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)

BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
    --output text)

DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text)

WEBSITE_URL=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteURL`].OutputValue' \
    --output text)

echo "User Pool ID: ${USER_POOL_ID}"
echo "Client ID: ${CLIENT_ID}"
echo "Bucket Name: ${BUCKET_NAME}"
echo "Distribution ID: ${DISTRIBUTION_ID}"
echo "Website URL: ${WEBSITE_URL}"

echo ""
echo -e "${BLUE}Step 4: Configuring frontend...${NC}"

# Create frontend environment file
cat > frontend/.env.production << EOF
REACT_APP_USER_POOL_ID=${USER_POOL_ID}
REACT_APP_USER_POOL_CLIENT_ID=${CLIENT_ID}
REACT_APP_REGION=${REGION}
EOF

echo -e "${GREEN}✓ Frontend environment configured${NC}"

echo ""
echo -e "${BLUE}Step 5: Installing frontend dependencies...${NC}"
cd frontend
npm install --silent
cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${BLUE}Step 6: Building frontend application...${NC}"
cd frontend
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo ""
echo -e "${BLUE}Step 7: Deploying frontend to S3...${NC}"
aws s3 sync frontend/build/ s3://${BUCKET_NAME}/ \
    --region ${REGION} \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "index.html" \
    --exclude "asset-manifest.json" \
    --exclude "service-worker.js"

# Upload index.html and service-worker.js with no cache
aws s3 cp frontend/build/index.html s3://${BUCKET_NAME}/index.html \
    --region ${REGION} \
    --cache-control "no-cache, no-store, must-revalidate"

echo -e "${GREEN}✓ Frontend deployed to S3${NC}"

echo ""
echo -e "${BLUE}Step 8: Invalidating CloudFront cache...${NC}"
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

echo "Invalidation ID: ${INVALIDATION_ID}"
echo "Waiting for CloudFront invalidation to complete..."
aws cloudfront wait invalidation-completed \
    --distribution-id ${DISTRIBUTION_ID} \
    --id ${INVALIDATION_ID}

echo -e "${GREEN}✓ CloudFront cache invalidated${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "======================================"
echo ""
echo -e "${YELLOW}Your application is now available at:${NC}"
echo -e "${GREEN}${WEBSITE_URL}${NC}"
echo ""
echo "Note: CloudFront distribution may take 10-15 minutes to fully propagate."
echo ""
echo "Configuration saved to: frontend/.env.production"
echo ""
echo "To update the application in the future, run this script again."
echo ""
