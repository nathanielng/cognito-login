import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resetPassword } from 'aws-amplify/auth';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await resetPassword({ username: email });

      // Navigate to reset password page
      navigate('/reset-password', { state: { email } });
    } catch (err: any) {
      console.error('Forgot password error:', err);

      if (err.name === 'UserNotFoundException') {
        setError('No account found with this email address.');
      } else if (err.name === 'LimitExceededException') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Forgot Password</h2>
      <p>Enter your email to reset your password</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="Enter your email"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="loading"></span>
              Sending Code...
            </>
          ) : (
            'Send Reset Code'
          )}
        </button>
      </form>

      <div className="text-center">
        Remember your password?{' '}
        <Link to="/login" className="link">
          Log In
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
