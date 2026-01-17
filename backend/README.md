# IAM Identity Center User Management API

This project creates a serverless API for managing IAM Identity Center users using pure CloudFormation. It includes a Lambda function that creates users and adds them to a "Kiro Pro" group, exposed through API Gateway with API key authentication.

## Architecture

- **Lambda Function**: Creates IAM Identity Center users and manages group membership (inline code)
- **API Gateway**: REST API with API key authentication
- **IAM Identity Center**: User and group management
- **CloudFormation**: Infrastructure as Code deployment (pure CloudFormation, no SAM CLI)

## Authentication Method

I've chosen **API Key authentication** over JWT tokens for this use case because:

1. **Simplicity**: API keys are easier to implement and manage for service-to-service communication
2. **AWS Native**: API Gateway has built-in API key support with usage plans and throttling
3. **Security**: Combined with HTTPS, API keys provide adequate security for this internal API
4. **Performance**: No token validation overhead on each request

If you need more advanced authentication (user context, expiration, etc.), JWT tokens with AWS Cognito would be a better choice.

## Prerequisites

- AWS CLI configured with appropriate permissions
- Python 3.11+ (for testing script only)
- IAM Identity Center instance (the script can create one if needed)

## Required Permissions

The deployment requires permissions for:
- CloudFormation stack operations
- Lambda function creation and management
- API Gateway setup
- IAM role and policy creation
- SSM Parameter Store access
- IAM Identity Center (SSO Admin and Identity Store) operations

## Checking Existing Deployments

Before deploying, you can check if the CloudFormation stack already exists and its current state:

### List All CloudFormation Stacks
```bash
# List all stacks in your account
aws cloudformation list-stacks --query 'StackSummaries[*].[StackName,StackStatus]' --output table

# Filter for stacks containing "kiro" in the name
aws cloudformation list-stacks --query 'StackSummaries[?contains(StackName, `kiro`)].[StackName,StackStatus]' --output table
```

### Check Specific Stack Status
```bash
# Check the status of the kiro-user-management-api stack
aws cloudformation describe-stacks --stack-name kiro-user-management-api --query 'Stacks[0].StackStatus' --output text
```

### Understanding Stack States

**Successful States** (deployment completed successfully):
- `CREATE_COMPLETE` - Stack was created successfully
- `UPDATE_COMPLETE` - Stack was updated successfully

**Failed States** (deployment failed and may need cleanup):
- `CREATE_FAILED` - Stack creation failed
- `ROLLBACK_COMPLETE` - Stack creation failed and was rolled back
- `UPDATE_ROLLBACK_COMPLETE` - Stack update failed and was rolled back
- `UPDATE_ROLLBACK_FAILED` - Stack update and rollback both failed
- `DELETE_FAILED` - Stack deletion failed

**In-Progress States** (deployment is currently running):
- `CREATE_IN_PROGRESS` - Stack is being created
- `UPDATE_IN_PROGRESS` - Stack is being updated
- `DELETE_IN_PROGRESS` - Stack is being deleted

### Get Detailed Stack Information
```bash
# Get comprehensive stack information including outputs
aws cloudformation describe-stacks --stack-name kiro-user-management-api --output table

# Get just the stack outputs (API endpoints, etc.)
aws cloudformation describe-stacks --stack-name kiro-user-management-api --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' --output table
```

### Check Stack Events (for troubleshooting failures)
```bash
# View recent stack events to understand what went wrong
aws cloudformation describe-stack-events --stack-name kiro-user-management-api --query 'StackEvents[0:10].[Timestamp,ResourceType,ResourceStatus,ResourceStatusReason]' --output table
```

**Note**: The enhanced deployment script (`deploy-cloudformation.sh`) automatically checks stack status and will:
- Prompt you to update existing successful stacks
- Prompt you to delete and recreate failed stacks
- Show current stack information if you choose to skip deployment

## Deployment

The deployment script has been enhanced to provide a fully automated experience:

### Quick Start (Fully Automated)
```bash
# Run without any parameters - the script will:
# 1. Auto-detect existing IAM Identity Center instances
# 2. Prompt to create an instance if none exists
# 3. Auto-generate a secure 32-character API key
# 4. Store the API key securely in Parameter Store
./deploy-cloudformation.sh

# Force update mode (skip all prompts)
./deploy-cloudformation.sh -f
```

### Advanced Usage

1. **Force update with no prompts**:
   ```bash
   ./deploy-cloudformation.sh -f
   ```

2. **With specific Identity Center instance**:
   ```bash
   ./deploy-cloudformation.sh arn:aws:sso:::instance/ssoins-1234567890abcdef
   ```

3. **Force update with specific instance**:
   ```bash
   ./deploy-cloudformation.sh -f arn:aws:sso:::instance/ssoins-1234567890abcdef
   ```

4. **With custom API key**:
   ```bash
   ./deploy-cloudformation.sh arn:aws:sso:::instance/ssoins-1234567890abcdef my-custom-api-key
   ```

5. **With specific region**:
   ```bash
   ./deploy-cloudformation.sh arn:aws:sso:::instance/ssoins-1234567890abcdef my-api-key us-west-2
   ```

### What the Script Does Automatically

**Identity Center Management**:
- ✅ Detects existing IAM Identity Center instances in your region
- ✅ Prompts to create a new instance if none exists
- ✅ Uses the first available instance if multiple exist

**API Key Management**:
- ✅ Checks Parameter Store for existing API keys
- ✅ Reuses existing keys to avoid conflicts
- ✅ Auto-generates secure 32-character alphanumeric keys when needed
- ✅ Stores keys securely in AWS Systems Manager Parameter Store

**Stack Management**:
- ✅ Detects existing CloudFormation stacks
- ✅ Prompts to update successful stacks or delete failed ones
- ✅ Shows current stack information if you choose to skip deployment

### Manual Deployment (Alternative)

If you prefer manual deployment or need to integrate with CI/CD:

1. **Get your Identity Center Instance ARN** (if not using auto-detection):
   ```bash
   aws sso-admin list-instances --query 'Instances[0].InstanceArn' --output text
   ```

2. **Deploy manually**:
   ```bash
   aws cloudformation deploy \
     --template-file template.yaml \
     --stack-name kiro-user-management-api \
     --parameter-overrides \
       IdentityCenterInstanceArn=arn:aws:sso:::instance/ssoins-your-instance-id \
       ApiKeyValue=your-secure-api-key-here \
     --capabilities CAPABILITY_IAM
   ```

### Deployment Output

After successful deployment, the script displays:
- 📋 **Stack outputs**: API endpoints and resource information
- 🔑 **API credentials**: Your API key and Parameter Store location
- 📝 **Next steps**: Instructions for testing and usage

Example output:
```
=== API CREDENTIALS ===
API Key: AbC123XyZ789SecureKey32Characters
Parameter Store Location: /kiro/kiro-user-management-api/api-key

To retrieve your API key later:
aws ssm get-parameter --name /kiro/kiro-user-management-api/api-key --with-decryption --query 'Parameter.Value' --output text
```

## API Usage

### Create User Endpoint

**POST** `/create-user`

**Headers**:
- `Content-Type: application/json`
- `x-api-key: <your-api-key>`

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "firstName": "John",    // Optional - extracted from name if not provided
  "lastName": "Doe"       // Optional - extracted from name if not provided
}
```

**Response** (200 OK):
```json
{
  "message": "User created successfully",
  "user_id": "1234567890abcdef",
  "email": "john.doe@example.com",
  "group": "Kiro Pro"
}
```

**Error Response** (500 - Duplicate User):
```json
{
  "message": "User with email john.doe@example.com already exists"
}
```

## Testing

### Automated Testing (Recommended)

The test script can automatically retrieve the API endpoint and key from AWS:

```bash
# Install required Python libraries
pip3 install requests boto3

# Run automated tests (no parameters needed)
python3 test_api.py
```

The script will:
1. Retrieve the API endpoint from CloudFormation stack outputs
2. Retrieve the API key from Parameter Store
3. Create a unique test user
4. Verify the user exists in IAM Identity Center
5. Test duplicate user handling

### Manual Testing

You can also provide the endpoint and key manually:

```bash
# Get the API key
API_KEY=$(aws ssm get-parameter --name /kiro/kiro-user-management-api/api-key --with-decryption --query 'Parameter.Value' --output text)

# Get the API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name kiro-user-management-api --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)

# Run tests with explicit parameters
python3 test_api.py $API_ENDPOINT $API_KEY
```

### Stack Verification

Check if the stack is deployed and the API is accessible:

```bash
python3 check_stack.py
```

This script verifies:
- CloudFormation stack status
- API key exists in Parameter Store
- API endpoint is accessible

## Manual Testing with curl

```bash
# Get the API key
API_KEY=$(aws ssm get-parameter --name /kiro/kiro-user-management-api/api-key --with-decryption --query 'Parameter.Value' --output text)

# Get the API endpoint
API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name kiro-user-management-api --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text)

# Test the API
curl -X POST $API_ENDPOINT/create-user \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "name": "Test User",
    "email": "test@example.com"
  }'
```

## Features

- ✅ Creates IAM Identity Center users
- ✅ Automatically adds users to "Kiro Pro" group
- ✅ Creates the group if it doesn't exist
- ✅ Prevents duplicate users (checks by email)
- ✅ API key authentication with usage plans
- ✅ Proper error handling and logging
- ✅ CORS support for web applications

## Error Handling

The API handles various error scenarios with user-friendly messages:
- Missing required fields (400): `"Missing required field: <field>"`
- Duplicate users (500): `"User with email <email> already exists"`
- Identity Center configuration issues (500)
- Invalid JSON (400): `"Invalid JSON in request body"`
- Authentication failures (403)

## Security Considerations

1. **API Key Security**: 
   - API key is auto-generated as a secure 32-character alphanumeric string
   - Stored as a SecureString in AWS Systems Manager Parameter Store
   - Never logged in CloudFormation outputs or CloudWatch logs
   - Retrieve securely using: `aws ssm get-parameter --name /kiro/kiro-user-management-api/api-key --with-decryption`
   - Existing keys are automatically reused to prevent conflicts
   - Rotate keys by updating the CloudFormation parameter with a new value
2. **HTTPS Only**: The API should only be accessed over HTTPS
3. **Rate Limiting**: Usage plans include throttling (100 req/sec, 200 burst)
4. **Least Privilege**: Lambda role has minimal required permissions
5. **Input Validation**: All inputs are validated before processing

## Monitoring

- CloudWatch Logs: Lambda function logs all operations
- API Gateway Metrics: Request count, latency, errors
- Usage Plans: Track API key usage and enforce limits

## Cleanup

To remove all resources:

```bash
aws cloudformation delete-stack --stack-name kiro-user-management-api
```

## Troubleshooting

1. **Identity Center Instance**: The script will auto-detect existing instances or prompt to create one
2. **Permissions**: Ensure your AWS credentials have the required permissions
3. **Group Creation**: The Lambda will create the "Kiro Pro" group if it doesn't exist
4. **API Key**: Auto-generated keys are always 32 characters (exceeds 20-character minimum)
5. **Stack States**: The script handles failed stacks by prompting for deletion and recreation
6. **Existing Deployments**: Use `aws cloudformation list-stacks` to check current stack status

## Cost Considerations

- Lambda: Pay per request (very low cost for typical usage)
- API Gateway: Pay per API call
- Identity Center: No additional charges for user/group management
- CloudWatch: Minimal logging costs

This setup is designed to be cost-effective for moderate usage patterns.

## Project Structure

```
├── template.yaml              # CloudFormation template with inline Lambda code
├── deploy-cloudformation.sh   # Deployment script with force update option
├── test_api.py               # API testing script (auto-retrieves credentials)
├── check_stack.py            # Stack verification script
├── TEST.md                   # Testing guide with curl examples
└── README.md                 # This file
```

The Lambda function code is embedded directly in the CloudFormation template, making this a completely self-contained deployment with no external dependencies.
