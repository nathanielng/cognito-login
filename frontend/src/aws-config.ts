// This file will be populated with your Cognito configuration after deployment
// You can also set these values in a .env file

export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || 'YOUR_USER_POOL_ID',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || 'YOUR_CLIENT_ID',
      region: process.env.REACT_APP_REGION || 'us-east-1',
    }
  }
};
