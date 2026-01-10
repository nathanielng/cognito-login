#!/bin/bash

# Deployment script for Cognito Login System
# This script will:
# 1. Install all dependencies
# 2. Build the frontend
# 3. Deploy the infrastructure using AWS CDK
# 4. Output the configuration details

set -e

echo "========================================"
echo "Cognito Login System Deployment"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS CDK is installed
if ! command -v cdk &> /dev/null; then
    echo -e "${YELLOW}AWS CDK not found. Installing globally...${NC}"
    npm install -g aws-cdk
fi

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo "Please configure your AWS credentials using 'aws configure'"
    exit 1
fi

echo -e "${GREEN}✓ AWS credentials configured${NC}"
echo ""

# Step 1: Install root dependencies
echo "Step 1: Installing root dependencies..."
npm install
echo -e "${GREEN}✓ Root dependencies installed${NC}"
echo ""

# Step 2: Install infrastructure dependencies
echo "Step 2: Installing infrastructure dependencies..."
cd infrastructure
npm install
cd ..
echo -e "${GREEN}✓ Infrastructure dependencies installed${NC}"
echo ""

# Step 3: Install frontend dependencies
echo "Step 3: Installing frontend dependencies..."
cd frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Step 4: Bootstrap CDK (if needed)
echo "Step 4: Bootstrapping AWS CDK..."
cd ../infrastructure
cdk bootstrap || echo -e "${YELLOW}CDK already bootstrapped${NC}"
echo -e "${GREEN}✓ CDK bootstrap complete${NC}"
echo ""

# Step 5: Deploy infrastructure (without frontend first to get config)
echo "Step 5: Creating temporary frontend build..."
cd ../frontend
mkdir -p build
echo '<!DOCTYPE html><html><body><h1>Deploying...</h1></body></html>' > build/index.html
cd ..
echo -e "${GREEN}✓ Temporary build created${NC}"
echo ""

echo "Step 6: Deploying infrastructure to AWS..."
cd infrastructure
cdk deploy --require-approval never --outputs-file ../outputs.json
cd ..
echo -e "${GREEN}✓ Infrastructure deployed${NC}"
echo ""

# Step 7: Extract configuration
echo "Step 7: Extracting configuration..."
if [ -f outputs.json ]; then
    USER_POOL_ID=$(cat outputs.json | grep -o '"UserPoolId"[^,]*' | grep -o ':.*' | tr -d ': "')
    CLIENT_ID=$(cat outputs.json | grep -o '"UserPoolClientId"[^,]*' | grep -o ':.*' | tr -d ': "')
    REGION=$(cat outputs.json | grep -o '"Region"[^,]*' | grep -o ':.*' | tr -d ': "')
    WEBSITE_URL=$(cat outputs.json | grep -o '"WebsiteURL"[^,]*' | grep -o ':.*' | tr -d ': "')

    echo -e "${GREEN}✓ Configuration extracted${NC}"
    echo ""
    echo "Configuration Details:"
    echo "  User Pool ID: $USER_POOL_ID"
    echo "  Client ID: $CLIENT_ID"
    echo "  Region: $REGION"
    echo ""

    # Create .env file
    cat > frontend/.env.production << EOF
REACT_APP_USER_POOL_ID=$USER_POOL_ID
REACT_APP_USER_POOL_CLIENT_ID=$CLIENT_ID
REACT_APP_REGION=$REGION
EOF

    echo -e "${GREEN}✓ Environment file created${NC}"
    echo ""
else
    echo -e "${RED}Error: outputs.json not found${NC}"
    exit 1
fi

# Step 8: Build frontend with actual config
echo "Step 8: Building frontend application..."
cd frontend
npm run build
cd ..
echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Step 9: Deploy again with actual frontend
echo "Step 9: Deploying final frontend to S3/CloudFront..."
cd infrastructure
cdk deploy --require-approval never
cd ..
echo -e "${GREEN}✓ Final deployment complete${NC}"
echo ""

# Success message
echo "========================================"
echo -e "${GREEN}Deployment Successful!${NC}"
echo "========================================"
echo ""
echo "Your Cognito Login System is now live!"
echo ""
echo -e "${GREEN}Website URL:${NC} $WEBSITE_URL"
echo ""
echo "Configuration saved in:"
echo "  - frontend/.env.production"
echo "  - outputs.json"
echo ""
echo "Note: CloudFront distribution may take 10-15 minutes to fully propagate."
echo "========================================"
