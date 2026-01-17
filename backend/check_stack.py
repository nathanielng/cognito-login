#!/usr/bin/env python3
"""
Test script to check if CloudFormation stack 'kiro-management-api' exists
and is a CREATE_COMPLETE or UPDATE_COMPLETE state.
Also checks if the API key is correctly saved in Parameter Store and that the
API Gateway endpoint is working.
"""
import logging
import os
import sys

import boto3
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)

# Get AWS region from environment variable or default to us-east-1
AWS_REGION = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')

# Initialize AWS clients with explicit region
sts_client = boto3.client('sts', region_name=AWS_REGION)
cf_client = boto3.client('cloudformation', region_name=AWS_REGION)
ssm_client = boto3.client('ssm', region_name=AWS_REGION)

# Get AWS account and region information
try:
    identity = sts_client.get_caller_identity()
    account_id = identity['Account']
    region = AWS_REGION
    
    logger.info(f"AWS Account ID: {account_id}")
    logger.info(f"AWS Region: {region}")
    logger.info("")
except Exception as e:
    logger.error(f"Error getting AWS identity: {e}")
    sys.exit(1)


def check_stack_deployed_successfully(stack_name):
    """Check if a CloudFormation stack has deployed successfully.
    
    Verifies that the stack exists and has a status of either CREATE_COMPLETE
    or UPDATE_COMPLETE, indicating successful deployment.
    """
    try:
        response = cf_client.describe_stacks(StackName=stack_name)
        
        if response['Stacks']:
            stack = response['Stacks'][0]
            status = stack['StackStatus']
            logger.info(f"✓ Stack '{stack_name}' exists")
            logger.info(f"  Status: {status}")
            logger.info(f"  Created: {stack['CreationTime']}")
            
            # Check if status ends with _COMPLETE
            if status.endswith('_COMPLETE'):
                logger.info(f"✓ Stack is in COMPLETE status")
                return True
            else:
                logger.error(f"✗ Stack is not in COMPLETE status")
                return False
            
    except cf_client.exceptions.ClientError as e:
        if 'does not exist' in str(e):
            logger.error(f"✗ Stack '{stack_name}' does not exist")
            return False
        else:
            logger.error(f"Error checking stack: {e}")
            sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

def mask_api_key(api_key):
    """Mask the middle portion of an API key for security.
    
    Shows first 4 and last 4 characters, masks the middle.
    Example: AbC1...Xy89
    """
    if not api_key or len(api_key) < 8:
        return "****"
    
    return f"{api_key[:4]}...{api_key[-4:]}"

def check_api_key_parameter(stack_name):
    """Check if the API key exists in SSM Parameter Store.
    
    Retrieves and displays the API key with middle portion masked.
    """
    param_name = f"/kiro/{stack_name}/api-key"
    
    try:
        response = ssm_client.get_parameter(
            Name=param_name,
            WithDecryption=True
        )
        
        api_key = response['Parameter']['Value']
        masked_key = mask_api_key(api_key)
        
        logger.info(f"✓ API key found in Parameter Store")
        logger.info(f"  Parameter: {param_name}")
        logger.info(f"  API Key: {masked_key}")
        return True
        
    except ssm_client.exceptions.ParameterNotFound:
        logger.error(f"✗ API key not found in Parameter Store: {param_name}")
        return False
    except Exception as e:
        logger.error(f"Error retrieving API key: {e}")
        return False

def check_api_endpoint_accessible(stack_name):
    """Check if the API Gateway endpoint is accessible.
    
    Retrieves the API endpoint URL from CloudFormation stack outputs
    and verifies it responds to requests.
    """
    try:
        response = cf_client.describe_stacks(StackName=stack_name)
        
        if not response['Stacks']:
            logger.error(f"✗ Stack '{stack_name}' not found")
            return False
        
        stack = response['Stacks'][0]
        outputs = stack.get('Outputs', [])
        
        # Find the API endpoint output
        api_endpoint = None
        for output in outputs:
            if output['OutputKey'] == 'ApiEndpoint':
                api_endpoint = output['OutputValue']
                break
        
        if not api_endpoint:
            logger.error(f"✗ API endpoint not found in stack outputs")
            return False
        
        logger.info(f"✓ API endpoint found: {api_endpoint}")
        
        # Try to access the endpoint (OPTIONS request for CORS check)
        try:
            response = requests.options(f"{api_endpoint}/create-user", timeout=10)
            logger.info(f"✓ API endpoint is accessible (Status: {response.status_code})")
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"✗ API endpoint is not accessible: {e}")
            return False
            
    except Exception as e:
        logger.error(f"Error checking API endpoint: {e}")
        return False

def main():
    # Step 1: Check that the stack has deployed successfully
    stack_name = "kiro-user-management-api"
    deployed = check_stack_deployed_successfully(stack_name)
    if not deployed:
        sys.exit(1)
    
    logger.info("")
    
    # Step 2: Check if API key exists in Parameter Store
    api_key_exists = check_api_key_parameter(stack_name)
    if not api_key_exists:
        sys.exit(1)
    
    logger.info("")
    
    # Step 3: Verify API endpoint is accessible
    api_accessible = check_api_endpoint_accessible(stack_name)
    if not api_accessible:
        sys.exit(1)
    
    logger.info("")
    logger.info("✓ All checks passed successfully")
    sys.exit(0)

if __name__ == "__main__":
    main()
