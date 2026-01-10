import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from 'aws-amplify/auth';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (!/(?=.*[a-z])/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/(?=.*[A-Z])/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/(?=.*\d)/.test(formData.password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
      setError('Password must contain at least one special character (!@#$%^&*)');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signUp({
        username: formData.email,
        password: formData.password,
        options: {
          userAttributes: {
            email: formData.email,
            given_name: formData.firstName,
            family_name: formData.lastName,
          },
        },
      });

      // Navigate to verification page
      navigate('/verify-email', { state: { email: formData.email } });
    } catch (err: any) {
      console.error('Sign up error:', err);

      // Handle specific error cases
      if (err.name === 'UsernameExistsException') {
        setError('An account with this email already exists. Please log in or use a different email.');
      } else if (err.name === 'InvalidPasswordException') {
        setError(err.message || 'Password does not meet requirements');
      } else if (err.name === 'InvalidParameterException') {
        setError(err.message || 'Invalid input. Please check your information and try again.');
      } else {
        setError(err.message || 'An error occurred during sign up. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Create Account</h2>
      <p>Sign up to get started</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Enter your first name"
            disabled={loading}
            autoComplete="given-name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Enter your last name"
            disabled={loading}
            autoComplete="family-name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            disabled={loading}
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
            placeholder="Confirm your password"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="loading"></span>
              Creating Account...
            </>
          ) : (
            'Sign Up'
          )}
        </button>
      </form>

      <div className="text-center">
        Already have an account?{' '}
        <Link to="/login" className="link">
          Log In
        </Link>
      </div>
    </div>
  );
};

export default SignUp;
