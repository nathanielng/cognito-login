# AWS Cognito Login System

A complete authentication system using Amazon Cognito with email verification, deployed on AWS infrastructure.

## Features

- **User Sign Up** with first name, last name, and email address
- **Email Verification** through AWS Cognito
- **User Login** with email and password
- **Forgot Password** flow with email-based password reset
- **Existing User Detection** with appropriate error handling
- **Protected Dashboard** accessible only to authenticated users
- **Secure Infrastructure** deployed on AWS with CloudFront CDN

## Architecture

- **Frontend**: React with TypeScript and AWS Amplify
- **Authentication**: AWS Cognito User Pool
- **Hosting**: S3 + CloudFront distribution
- **Infrastructure**: AWS CDK (TypeScript) **or** CloudFormation (YAML)

## Deployment Options

This project supports two deployment methods:

1. **CloudFormation** (Recommended) - Pure CloudFormation template with no circular dependencies
   - See [CloudFormation README](infrastructure/cloudformation/README.md) for details
   - Simpler, more transparent, no build step for infrastructure
   - Separate infrastructure and deployment steps

2. **AWS CDK** - TypeScript-based infrastructure as code
   - Single command deployment
   - Automatic frontend deployment
   - Type safety and reusable constructs

## Prerequisites

Before deploying, ensure you have:

1. **Node.js** (v18 or later) - [Download](https://nodejs.org/)
2. **AWS CLI** - [Installation Guide](https://aws.amazon.com/cli/)
3. **AWS Account** with appropriate permissions
4. **Configured AWS Credentials**:
   ```bash
   aws configure
   ```

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd cognito-login
```

### 2. Choose Your Deployment Method

#### Option A: CloudFormation (Recommended)

```bash
chmod +x infrastructure/cloudformation/deploy-cloudformation.sh
./infrastructure/cloudformation/deploy-cloudformation.sh
```

**Advantages**: No circular dependencies, simpler troubleshooting, no infrastructure build step

See [CloudFormation README](infrastructure/cloudformation/README.md) for detailed documentation.

#### Option B: AWS CDK

```bash
chmod +x deploy.sh
./deploy.sh
```

**Advantages**: Single command deployment, automatic frontend deployment

Both scripts will:
- Install all dependencies
- Build the frontend application
- Deploy the AWS infrastructure
- Configure Cognito User Pool
- Deploy to S3 and CloudFront
- Output your website URL and configuration

### 3. Access Your Application

After deployment completes (10-15 minutes for CloudFront), access your application at the provided CloudFront URL.

## Manual Deployment

If you prefer to deploy manually:

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install infrastructure dependencies
cd infrastructure
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Bootstrap AWS CDK

```bash
cd infrastructure
cdk bootstrap
```

### Step 3: Deploy Infrastructure

```bash
# Create temporary build
cd ../frontend
mkdir -p build
echo '<!DOCTYPE html><html><body><h1>Deploying...</h1></body></html>' > build/index.html
cd ..

# Deploy to get Cognito config
cd infrastructure
cdk deploy --outputs-file ../outputs.json
cd ..
```

### Step 4: Configure Frontend

Extract the values from `outputs.json` and create `frontend/.env.production`:

```env
REACT_APP_USER_POOL_ID=<your-user-pool-id>
REACT_APP_USER_POOL_CLIENT_ID=<your-client-id>
REACT_APP_REGION=<your-region>
```

### Step 5: Build and Deploy Frontend

```bash
cd frontend
npm run build
cd ../infrastructure
cdk deploy
```

## Project Structure

```
cognito-login/
├── frontend/                 # React frontend application
│   ├── public/              # Public assets
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── SignUp.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── VerifyEmail.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   ├── ResetPassword.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── App.tsx          # Main app component
│   │   ├── aws-config.ts    # AWS Amplify configuration
│   │   └── index.tsx        # Entry point
│   └── package.json
├── infrastructure/           # AWS CDK infrastructure
│   ├── bin/
│   │   └── app.ts           # CDK app entry point
│   ├── lib/
│   │   └── cognito-auth-stack.ts  # Cognito stack definition
│   └── package.json
├── deploy.sh                # Automated deployment script
├── package.json             # Root package.json
└── README.md
```

## User Flows

### Sign Up Flow

1. User enters first name, last name, email, and password
2. System validates all inputs
3. Cognito creates user account
4. Cognito sends verification email
5. User redirected to email verification page

### Email Verification Flow

1. User receives 6-digit code via email
2. User enters code on verification page
3. Cognito confirms email address
4. User can now log in

### Login Flow

1. User enters email and password
2. Cognito authenticates credentials
3. If email not verified, redirect to verification
4. If successful, redirect to dashboard

### Forgot Password Flow

1. User clicks "Forgot Password"
2. User enters email address
3. Cognito sends reset code via email
4. User enters code and new password
5. Password updated, user redirected to login

## Error Handling

The system handles various error scenarios:

- **Existing User**: "An account with this email already exists"
- **Invalid Password**: Password requirements not met
- **Invalid Code**: Verification/reset code incorrect
- **Expired Code**: Code has expired, user can request new one
- **Unverified Email**: User redirected to verification page
- **User Not Found**: No account exists with provided email

## Password Requirements

Passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

## Configuration

### Cognito User Pool Settings

- **Sign In**: Email address
- **Auto-verify**: Email
- **Required Attributes**: Email, First Name, Last Name
- **Account Recovery**: Email only
- **Password Policy**: Strong (see requirements above)

### Infrastructure Components

- **Cognito User Pool**: Manages user authentication
- **S3 Bucket**: Hosts frontend application
- **CloudFront Distribution**: CDN for fast global access
- **Origin Access Identity**: Secures S3 bucket access

## Development

### Run Frontend Locally

```bash
cd frontend

# Create .env.local with your Cognito configuration
cat > .env.local << EOF
REACT_APP_USER_POOL_ID=<your-user-pool-id>
REACT_APP_USER_POOL_CLIENT_ID=<your-client-id>
REACT_APP_REGION=<your-region>
EOF

npm start
```

The app will run on `http://localhost:3000`

### Test Infrastructure Changes

```bash
cd infrastructure
npm run synth    # Generate CloudFormation template
npm run diff     # Show changes to be deployed
npm run deploy   # Deploy changes
```

## Cleanup

To remove all deployed resources:

```bash
cd infrastructure
cdk destroy
```

This will delete:
- Cognito User Pool
- S3 Bucket and contents
- CloudFront Distribution
- All associated resources

## Security Considerations

1. **Password Policy**: Enforced strong password requirements
2. **Email Verification**: Required before users can log in
3. **HTTPS Only**: All traffic redirected to HTTPS via CloudFront
4. **Origin Access Identity**: S3 bucket not publicly accessible
5. **User Pool Client**: Configured with secure auth flows
6. **No Public Access**: S3 bucket has all public access blocked

## Troubleshooting

### CloudFront takes too long

CloudFront distributions can take 10-15 minutes to propagate. Be patient after deployment.

### Email not received

Check your spam folder. Cognito's default email service may trigger spam filters. For production, configure SES.

### Build fails

Ensure all dependencies are installed:
```bash
npm run install:all
```

### AWS Credentials Error

Configure your AWS credentials:
```bash
aws configure
```

### CDK Bootstrap Error

Bootstrap your AWS account for CDK:
```bash
cd infrastructure
cdk bootstrap
```

## Cost Considerations

- **Cognito**: Free tier includes 50,000 MAUs (Monthly Active Users)
- **CloudFront**: Free tier includes 1TB of data transfer
- **S3**: Minimal storage costs for static files
- **Estimated Cost**: Free for small usage, ~$1-5/month for moderate traffic

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions:
- Check the troubleshooting section
- Review AWS Cognito documentation
- Open an issue in the repository

## Additional Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [React Documentation](https://react.dev/)