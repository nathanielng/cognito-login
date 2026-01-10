#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CognitoAuthStack } from '../lib/cognito-auth-stack';

const app = new cdk.App();
new CognitoAuthStack(app, 'CognitoLoginStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Cognito User Pool for authentication with email verification'
});
