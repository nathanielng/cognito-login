import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, fetchUserAttributes, signOut } from 'aws-amplify/auth';

interface UserAttributes {
  email?: string;
  given_name?: string;
  family_name?: string;
  email_verified?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [attributes, setAttributes] = useState<UserAttributes>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      const userAttributes = await fetchUserAttributes();
      setUser(currentUser);
      setAttributes(userAttributes);
    } catch (err) {
      console.error('Not authenticated:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div style={{ textAlign: 'center' }}>
          <span className="loading" style={{ borderColor: '#667eea' }}></span>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <h1>Welcome to Your Dashboard!</h1>

      {user && (
        <div className="user-info">
          <h3>Your Profile</h3>
          <p>
            <strong>Name:</strong> {attributes.given_name} {attributes.family_name}
          </p>
          <p>
            <strong>Email:</strong> {attributes.email}
          </p>
          <p>
            <strong>Email Verified:</strong>{' '}
            {attributes.email_verified === 'true' ? (
              <span style={{ color: 'green' }}>✓ Yes</span>
            ) : (
              <span style={{ color: 'red' }}>✗ No</span>
            )}
          </p>
          <p>
            <strong>User ID:</strong> {user.userId}
          </p>
        </div>
      )}

      <div style={{ marginTop: '30px' }}>
        <button onClick={handleSignOut} className="btn btn-primary">
          Sign Out
        </button>
      </div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h3>Authentication Status</h3>
        <p style={{ color: '#666' }}>
          You are successfully authenticated with AWS Cognito! This dashboard demonstrates that:
        </p>
        <ul style={{ marginLeft: '20px', color: '#666' }}>
          <li>Your email has been verified</li>
          <li>You can securely access protected resources</li>
          <li>Your session is managed by Cognito</li>
          <li>You can safely sign out when done</li>
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
