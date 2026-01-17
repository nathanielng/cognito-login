#!/usr/bin/env python3
"""
Test script for the IAM Identity Center User Management API
"""
import json
import os
import random
import sys
import time

import boto3
import requests

# Get AWS region from environment variable or default to us-east-1
AWS_REGION = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
STACK_NAME = 'kiro-user-management-api'

# Initialize AWS clients
identitystore_client = boto3.client('identitystore', region_name=AWS_REGION)
sso_admin_client = boto3.client('sso-admin', region_name=AWS_REGION)
cf_client = boto3.client('cloudformation', region_name=AWS_REGION)
ssm_client = boto3.client('ssm', region_name=AWS_REGION)


def get_api_endpoint():
    """Get the API endpoint from CloudFormation stack outputs."""
    try:
        response = cf_client.describe_stacks(StackName=STACK_NAME)
        
        if not response['Stacks']:
            print(f"❌ Stack '{STACK_NAME}' not found")
            return None
        
        outputs = response['Stacks'][0].get('Outputs', [])
        
        for output in outputs:
            if output['OutputKey'] == 'ApiEndpoint':
                return output['OutputValue']
        
        print("❌ ApiEndpoint not found in stack outputs")
        return None
        
    except Exception as e:
        print(f"❌ Error getting API endpoint: {e}")
        return None


def get_api_key():
    """Get the API key from Parameter Store."""
    param_name = f"/kiro/{STACK_NAME}/api-key"
    
    try:
        response = ssm_client.get_parameter(
            Name=param_name,
            WithDecryption=True
        )
        
        return response['Parameter']['Value']
        
    except ssm_client.exceptions.ParameterNotFound:
        print(f"❌ API key not found in Parameter Store: {param_name}")
        return None
    except Exception as e:
        print(f"❌ Error retrieving API key: {e}")
        return None


def get_identity_store_id():
    """Get the Identity Store ID from the CloudFormation stack."""
    try:
        # Get the Identity Center instance ARN from CloudFormation
        response = cf_client.describe_stacks(StackName=STACK_NAME)
        
        for param in response['Stacks'][0]['Parameters']:
            if param['ParameterKey'] == 'IdentityCenterInstanceArn':
                instance_arn = param['ParameterValue']
                break
        else:
            print("❌ Could not find IdentityCenterInstanceArn parameter")
            return None
        
        # Get the Identity Store ID from the instance
        instances = sso_admin_client.list_instances()
        for instance in instances['Instances']:
            if instance['InstanceArn'] == instance_arn:
                return instance['IdentityStoreId']
        
        print("❌ Could not find Identity Store ID")
        return None
        
    except Exception as e:
        print(f"❌ Error getting Identity Store ID: {e}")
        return None


def verify_user_in_identity_center(identity_store_id, email, expected_name):
    """Verify that the user exists in IAM Identity Center with correct details."""
    try:
        # Since we use email as username, we can filter by userName
        response = identitystore_client.list_users(
            IdentityStoreId=identity_store_id,
            Filters=[
                {
                    'AttributePath': 'userName',
                    'AttributeValue': email
                }
            ]
        )
        
        if not response['Users']:
            print(f"❌ User not found in Identity Center with username/email: {email}")
            return False
        
        user = response['Users'][0]
        display_name = user.get('DisplayName', '')
        user_name = user.get('UserName', '')
        user_id = user.get('UserId', '')
        
        # Get email from the user object
        emails = user.get('Emails', [])
        user_email = emails[0]['Value'] if emails else 'N/A'
        
        print(f"✅ User found in Identity Center:")
        print(f"   User ID: {user_id}")
        print(f"   Display Name: {display_name}")
        print(f"   User Name: {user_name}")
        print(f"   Email: {user_email}")
        
        # Verify the name matches
        if display_name == expected_name:
            print(f"✅ Display name matches expected value: {expected_name}")
            return True
        else:
            print(f"❌ Display name mismatch. Expected: {expected_name}, Got: {display_name}")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying user in Identity Center: {e}")
        return False


def test_create_user(api_endpoint, api_key, user_data, expect_success=True):
    """Test the create user endpoint."""
    
    url = f"{api_endpoint}/create-user"
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': api_key
    }
    
    print(f"Testing API endpoint: {url}")
    print(f"User data: {json.dumps(user_data, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=user_data)
        
        print(f"\nResponse Status: {response.status_code}")
        
        try:
            response_json = response.json()
            print(f"Response Body: {json.dumps(response_json, indent=2)}")
        except json.JSONDecodeError:
            print(f"Response Body (raw): {response.text}")
            return False
        
        if expect_success:
            if response.status_code == 200:
                print("✅ User created successfully!")
                return True
            else:
                print("❌ User creation failed!")
                return False
        else:
            # Expecting failure (duplicate user)
            if response.status_code != 200:
                if 'already exists' in response_json.get('message', '').lower():
                    print("✅ Duplicate user correctly rejected!")
                    return True
                else:
                    print("✅ User creation failed as expected")
                    return True
            else:
                print("❌ Expected failure but user was created!")
                return False
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False


def main():
    # Allow optional command line arguments for backwards compatibility
    if len(sys.argv) == 3:
        api_endpoint = sys.argv[1].rstrip('/')
        api_key = sys.argv[2]
        print("Using API endpoint and key from command line arguments")
    else:
        print("Retrieving API endpoint and key from AWS...")
        print()
        
        # Get API endpoint from CloudFormation
        api_endpoint = get_api_endpoint()
        if not api_endpoint:
            print("❌ Failed to retrieve API endpoint")
            sys.exit(1)
        print(f"✅ API Endpoint: {api_endpoint}")
        
        # Get API key from Parameter Store
        api_key = get_api_key()
        if not api_key:
            print("❌ Failed to retrieve API key")
            sys.exit(1)
        print(f"✅ API Key: {api_key[:4]}...{api_key[-4:]}")
        print()
    
    # Generate unique identifier for this test run
    unique_id = random.randint(1000, 9999)
    
    # Test data with unique email and name
    test_user = {
        "name": f"Test User {unique_id}",
        "email": f"testuser{unique_id}@example.com",
        "firstName": "Test",
        "lastName": f"User{unique_id}"
    }
    
    print("🚀 Testing IAM Identity Center User Management API")
    print("=" * 60)
    print(f"Test Run ID: {unique_id}")
    print()
    
    # Get Identity Store ID
    print("📋 Step 1: Getting Identity Store ID")
    print("-" * 60)
    identity_store_id = get_identity_store_id()
    if not identity_store_id:
        print("❌ Cannot proceed without Identity Store ID")
        sys.exit(1)
    print(f"✅ Identity Store ID: {identity_store_id}")
    print()
    
    # Test 1: Create new user
    print(f"📝 Step 2: Creating unique user {test_user['name']}")
    print("-" * 60)
    success = test_create_user(api_endpoint, api_key, test_user, expect_success=True)
    if not success:
        print("❌ Failed to create user. Exiting.")
        sys.exit(1)
    print()
    
    # Wait a moment for eventual consistency
    print("⏳ Waiting 2 seconds for eventual consistency...")
    time.sleep(2)
    print()
    
    # Test 2: Verify user exists in Identity Center
    print("🔍 Step 3: Verifying user in IAM Identity Center")
    print("-" * 60)
    verified = verify_user_in_identity_center(
        identity_store_id,
        test_user['email'],
        test_user['name']
    )
    if not verified:
        print("❌ User verification failed")
        sys.exit(1)
    print()
    
    # Test 3: Try to create duplicate user
    print("📝 Step 4: Testing duplicate user creation (should fail gracefully)")
    print("-" * 60)
    duplicate_success = test_create_user(api_endpoint, api_key, test_user, expect_success=False)
    if not duplicate_success:
        print("❌ Duplicate user handling failed")
        sys.exit(1)
    print()
    
    print("=" * 60)
    print("🎉 All tests passed successfully!")
    print(f"✅ Created user: {test_user['name']} ({test_user['email']})")
    print(f"✅ Verified user exists in Identity Center")
    print(f"✅ Duplicate user creation handled gracefully")


if __name__ == "__main__":
    main()
