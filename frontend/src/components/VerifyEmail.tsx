import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (!email) {
      setError('Email not found. Please sign up again.');
      return;
    }

    setLoading(true);

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      setSuccess('Email verified successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Verification error:', err);

      if (err.name === 'CodeMismatchException') {
        setError('Invalid verification code. Please check and try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new code.');
      } else if (err.name === 'NotAuthorizedException') {
        setError('User is already verified. Please log in.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(err.message || 'An error occurred during verification. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setSuccess('');

    if (!email) {
      setError('Email not found. Please sign up again.');
      return;
    }

    setResending(true);

    try {
      await resendSignUpCode({ username: email });
      setSuccess('Verification code resent! Please check your email.');
    } catch (err: any) {
      console.error('Resend error:', err);
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Verify Your Email</h2>
      <p>
        We've sent a verification code to <strong>{email || 'your email'}</strong>
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!email && (
        <div className="info-message">
          Email address not found. Please{' '}
          <Link to="/signup" className="link">
            sign up
          </Link>{' '}
          again.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="code">Verification Code</label>
          <input
            type="text"
            id="code"
            name="code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError('');
              setSuccess('');
            }}
            placeholder="Enter 6-digit code"
            disabled={loading || !email}
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !email}>
          {loading ? (
            <>
              <span className="loading"></span>
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleResendCode}
          disabled={resending || !email}
        >
          {resending ? 'Resending...' : 'Resend Code'}
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

export default VerifyEmail;
