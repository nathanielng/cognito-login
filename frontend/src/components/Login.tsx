import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from 'aws-amplify/auth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim() || !formData.password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn({
        username: formData.email,
        password: formData.password,
      });

      if (result.isSignedIn) {
        navigate('/dashboard');
      } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        // User needs to verify their email
        navigate('/verify-email', { state: { email: formData.email } });
      }
    } catch (err: any) {
      console.error('Login error:', err);

      if (err.name === 'UserNotConfirmedException') {
        setError('Please verify your email address before logging in.');
        setTimeout(() => {
          navigate('/verify-email', { state: { email: formData.email } });
        }, 2000);
      } else if (err.name === 'NotAuthorizedException') {
        setError('Incorrect email or password. Please try again.');
      } else if (err.name === 'UserNotFoundException') {
        setError('No account found with this email. Please sign up.');
      } else {
        setError(err.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Welcome Back</h2>
      <p>Log in to your account</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
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
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <div style={{ textAlign: 'right', marginBottom: '20px' }}>
          <Link to="/forgot-password" className="link" style={{ fontSize: '14px' }}>
            Forgot Password?
          </Link>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? (
            <>
              <span className="loading"></span>
              Logging In...
            </>
          ) : (
            'Log In'
          )}
        </button>
      </form>

      <div className="text-center">
        Don't have an account?{' '}
        <Link to="/signup" className="link">
          Sign Up
        </Link>
      </div>
    </div>
  );
};

export default Login;
