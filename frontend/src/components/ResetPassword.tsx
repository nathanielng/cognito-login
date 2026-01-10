import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { confirmResetPassword } from 'aws-amplify/auth';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [formData, setFormData] = useState({
    code: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const validatePassword = () => {
    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])/.test(formData.newPassword)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/(?=.*\d)/.test(formData.newPassword)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/(?=.*[!@#$%^&*])/.test(formData.newPassword)) {
      setError('Password must contain at least one special character (!@#$%^&*)');
      return false;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.code.trim()) {
      setError('Please enter the verification code');
      return;
    }

    if (!validatePassword()) {
      return;
    }

    if (!email) {
      setError('Email not found. Please start the password reset process again.');
      return;
    }

    setLoading(true);

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: formData.code,
        newPassword: formData.newPassword,
      });

      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      console.error('Reset password error:', err);

      if (err.name === 'CodeMismatchException') {
        setError('Invalid verification code. Please check and try again.');
      } else if (err.name === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new one.');
      } else if (err.name === 'InvalidPasswordException') {
        setError(err.message || 'Password does not meet requirements');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
      <p>
        Enter the code sent to <strong>{email || 'your email'}</strong>
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {!email && (
        <div className="info-message">
          Email address not found. Please{' '}
          <Link to="/forgot-password" className="link">
            start the password reset process
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
            value={formData.code}
            onChange={handleChange}
            placeholder="Enter 6-digit code"
            disabled={loading || !email}
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="Enter new password"
            disabled={loading || !email}
            autoComplete="new-password"
          />
          <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
            Must be at least 8 characters with uppercase, lowercase, number, and special character
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            disabled={loading || !email}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !email}>
          {loading ? (
            <>
              <span className="loading"></span>
              Resetting Password...
            </>
          ) : (
            'Reset Password'
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

export default ResetPassword;
