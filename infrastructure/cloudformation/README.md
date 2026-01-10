# CloudFormation Deployment

This directory contains pure CloudFormation templates as an alternative to the AWS CDK deployment.

## CloudFormation vs CDK

### Advantages of CloudFormation

1. **No Build Step**: CloudFormation templates are declarative YAML/JSON files that don't require compilation
2. **Direct AWS Integration**: Native AWS service with no additional dependencies
3. **Version Control Friendly**: Easy to diff and review changes
4. **No Node.js Required**: Only AWS CLI is needed for deployment
5. **Simpler CI/CD**: Easier to integrate into pipelines without build steps

### How We Avoid Circular Dependencies

The CDK version uses `BucketDeployment` construct which creates a potential complexity:
- CloudFront depends on S3 (as origin)
- BucketDeployment depends on CloudFront (for invalidation)
- BucketDeployment writes to S3

This CloudFormation approach **eliminates the circular dependency** by:

1. **Separating Infrastructure from Deployment**: CloudFormation only creates infrastructure
2. **Sequential Deployment Process**:
   - First: Deploy CloudFormation stack (Cognito, S3, CloudFront)
   - Then: Build and upload frontend separately using AWS CLI
   - Finally: Invalidate CloudFront cache
3. **No Custom Resources**: Avoids Lambda-backed custom resources that CDK uses

### Trade-offs

**CloudFormation Advantages:**
- Simpler resource dependencies
- No risk of circular dependencies
- Easier to troubleshoot
- More transparent deployment process

**CDK Advantages:**
- Single-command deployment
- Automatic frontend deployment and cache invalidation
- Type safety and better IDE support
- Reusable constructs

## Prerequisites

1. **AWS CLI** (v2 or later)
   ```bash
   aws --version
   ```

2. **Configured AWS Credentials**
   ```bash
   aws configure
   ```

3. **Node.js** (for building frontend)
   ```bash
   node --version
   ```

4. **Proper IAM Permissions**:
   - CloudFormation
   - Cognito
   - S3
   - CloudFront
   - IAM (for creating roles)

## Quick Start

### 1. Deploy Everything

```bash
chmod +x infrastructure/cloudformation/deploy-cloudformation.sh
./infrastructure/cloudformation/deploy-cloudformation.sh
```

This script will:
1. Validate the CloudFormation template
2. Deploy the stack (or update if exists)
3. Retrieve outputs
4. Configure frontend environment
5. Build frontend
6. Upload to S3
7. Invalidate CloudFront cache

### 2. Access Your Application

After deployment completes, the script will output your website URL:
```
https://d1234567890abc.cloudfront.net
```

## Manual Deployment

If you prefer to deploy step-by-step:

### Step 1: Validate Template

```bash
aws cloudformation validate-template \
    --template-body file://infrastructure/cloudformation/cognito-auth-stack.yaml \
    --region us-east-1
```

### Step 2: Deploy Stack

```bash
aws cloudformation create-stack \
    --stack-name cognito-login-stack \
    --template-body file://infrastructure/cloudformation/cognito-auth-stack.yaml \
    --region us-east-1 \
    --capabilities CAPABILITY_IAM
```

Wait for completion:
```bash
aws cloudformation wait stack-create-complete \
    --stack-name cognito-login-stack \
    --region us-east-1
```

### Step 3: Get Stack Outputs

```bash
aws cloudformation describe-stacks \
    --stack-name cognito-login-stack \
    --region us-east-1 \
    --query 'Stacks[0].Outputs'
```

### Step 4: Configure Frontend

Create `frontend/.env.production` with the values from stack outputs:

```env
REACT_APP_USER_POOL_ID=<UserPoolId from outputs>
REACT_APP_USER_POOL_CLIENT_ID=<UserPoolClientId from outputs>
REACT_APP_REGION=<Region from outputs>
```

### Step 5: Build Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### Step 6: Upload to S3

```bash
BUCKET_NAME=<WebsiteBucketName from outputs>

# Upload all files except index.html with long cache
aws s3 sync frontend/build/ s3://${BUCKET_NAME}/ \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "index.html"

# Upload index.html with no cache
aws s3 cp frontend/build/index.html s3://${BUCKET_NAME}/index.html \
    --cache-control "no-cache, no-store, must-revalidate"
```

### Step 7: Invalidate CloudFront

```bash
DISTRIBUTION_ID=<CloudFrontDistributionId from outputs>

aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*"
```

## Updating the Application

To update the application after making changes:

### Option 1: Use the Script

```bash
./infrastructure/cloudformation/deploy-cloudformation.sh
```

### Option 2: Manual Update

1. **Update Infrastructure** (if template changed):
```bash
aws cloudformation update-stack \
    --stack-name cognito-login-stack \
    --template-body file://infrastructure/cloudformation/cognito-auth-stack.yaml \
    --region us-east-1 \
    --capabilities CAPABILITY_IAM
```

2. **Rebuild and Upload Frontend**:
```bash
cd frontend
npm run build
cd ..

aws s3 sync frontend/build/ s3://${BUCKET_NAME}/ --delete
aws cloudfront create-invalidation --distribution-id ${DISTRIBUTION_ID} --paths "/*"
```

## Stack Parameters

The template accepts the following parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| ProjectName | cognito-login | Project name used for resource naming |

To customize:
```bash
aws cloudformation create-stack \
    --stack-name cognito-login-stack \
    --template-body file://infrastructure/cloudformation/cognito-auth-stack.yaml \
    --parameters ParameterKey=ProjectName,ParameterValue=my-project \
    --region us-east-1
```

## Stack Outputs

The stack exports the following outputs:

| Output | Description |
|--------|-------------|
| UserPoolId | Cognito User Pool ID |
| UserPoolClientId | Cognito User Pool Client ID |
| UserPoolArn | Cognito User Pool ARN |
| Region | AWS Region |
| WebsiteBucketName | S3 Bucket name |
| CloudFrontDistributionId | CloudFront Distribution ID |
| CloudFrontDomainName | CloudFront domain name |
| WebsiteURL | Full HTTPS URL to access the application |
| ConfigurationCommand | Command to configure frontend |

## Cleanup

To delete all resources:

```bash
chmod +x infrastructure/cloudformation/destroy-cloudformation.sh
./infrastructure/cloudformation/destroy-cloudformation.sh
```

Or manually:

```bash
# Empty the S3 bucket first
BUCKET_NAME=$(aws cloudformation describe-stacks \
    --stack-name cognito-login-stack \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
    --output text)

aws s3 rm s3://${BUCKET_NAME}/ --recursive

# Delete the stack
aws cloudformation delete-stack \
    --stack-name cognito-login-stack \
    --region us-east-1

# Wait for deletion
aws cloudformation wait stack-delete-complete \
    --stack-name cognito-login-stack \
    --region us-east-1
```

## Template Structure

The CloudFormation template creates:

1. **AWS::Cognito::UserPool**
   - Email-based authentication
   - Auto email verification
   - Strong password policy
   - Required attributes: email, given_name, family_name

2. **AWS::Cognito::UserPoolClient**
   - Web client configuration
   - USER_PASSWORD_AUTH and USER_SRP_AUTH flows
   - 30-day refresh token validity

3. **AWS::S3::Bucket**
   - Website hosting enabled
   - All public access blocked
   - Versioning enabled
   - Serves as CloudFront origin

4. **AWS::CloudFront::CloudFrontOriginAccessIdentity**
   - Allows CloudFront to access S3
   - Maintains bucket security

5. **AWS::S3::BucketPolicy**
   - Grants read access to CloudFront OAI
   - No direct public access

6. **AWS::CloudFront::Distribution**
   - HTTPS redirect enforced
   - Custom error pages for SPA routing
   - Caching optimizations
   - Gzip compression enabled

## Dependency Graph

```
CognitoUserPool (independent)
  └─> CognitoUserPoolClient

WebsiteBucket (independent)
  └─> CloudFrontOAI (independent)
       └─> WebsiteBucketPolicy
            └─> CloudFrontDistribution
```

**No circular dependencies!** Each resource depends only on resources created before it.

## Troubleshooting

### Template Validation Fails

Check YAML syntax:
```bash
yamllint infrastructure/cloudformation/cognito-auth-stack.yaml
```

### Stack Creation Fails

View error details:
```bash
aws cloudformation describe-stack-events \
    --stack-name cognito-login-stack \
    --region us-east-1 \
    --max-items 20
```

### S3 Upload Permission Denied

Ensure your AWS credentials have S3 write permissions:
```bash
aws s3 ls s3://${BUCKET_NAME}/
```

### CloudFront Invalidation Fails

Check distribution status:
```bash
aws cloudfront get-distribution \
    --id ${DISTRIBUTION_ID} \
    --query 'Distribution.Status'
```

### Cannot Delete Stack

Empty S3 bucket first:
```bash
aws s3 rm s3://${BUCKET_NAME}/ --recursive
```

## Best Practices

1. **Version Control**: Always commit CloudFormation templates
2. **Change Sets**: Use change sets for stack updates in production
3. **Stack Policies**: Consider stack policies to protect critical resources
4. **Tagging**: Add tags for cost allocation and organization
5. **Parameter Store**: Store configuration in SSM Parameter Store for production

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Deploy CloudFormation

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy CloudFormation
        run: |
          chmod +x infrastructure/cloudformation/deploy-cloudformation.sh
          ./infrastructure/cloudformation/deploy-cloudformation.sh
```

## Cost Estimation

Use AWS Cost Calculator or:

```bash
aws cloudformation estimate-template-cost \
    --template-body file://infrastructure/cloudformation/cognito-auth-stack.yaml
```

Expected monthly costs (low traffic):
- Cognito: $0 (free tier: 50,000 MAUs)
- S3: $0.01 - $0.50
- CloudFront: $0 (free tier: 1TB transfer)
- **Total: ~$0-5/month**

## Security Considerations

This template implements:
- ✅ S3 bucket public access blocked
- ✅ CloudFront OAI for S3 access
- ✅ HTTPS-only via CloudFront
- ✅ Strong Cognito password policy
- ✅ Email verification required
- ✅ Versioning enabled on S3
- ✅ Advanced security mode for Cognito

## Additional Resources

- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)
- [CloudFormation Template Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-reference.html)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [Cognito CloudFormation Resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_Cognito.html)
