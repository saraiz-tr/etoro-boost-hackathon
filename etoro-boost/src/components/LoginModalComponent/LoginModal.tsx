import { useState } from 'react';
import { Modal, Form, Button, Spinner } from 'react-bootstrap';
//import { EToroLogo } from './icons/EToroLogo';

interface LoginModalProps {
  show: boolean;
  onHide: () => void;
  onLoginSuccess: (token: string, xCsrfToken: string, username: string) => void;
}

export const LoginModal = ({ show, onHide, onLoginSuccess }: LoginModalProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    // Reset field errors
    setUsernameError('');
    setPasswordError('');
    
    // Validate empty fields
    let hasError = false;
    if (!username) {
      setUsernameError('Username is required');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }
    
    if (hasError) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/login/etoro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Login successful!');
        if (onLoginSuccess) {
          onLoginSuccess(data['x-token'], data['x-csrf-token'], username);
        }
        setTimeout(() => {
          onHide();
        }, 1000);
      } else {
        setError(data.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred while connecting to eToro. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton closeVariant="white">
        <Modal.Title>Log in with eToro</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form id="loginForm" onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError('');
              }}
              isInvalid={!!usernameError}
              required
              minLength={3}
            />
            {usernameError && <Form.Control.Feedback type="invalid">{usernameError}</Form.Control.Feedback>}
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              isInvalid={!!passwordError}
              required
              minLength={6}
            />
            {passwordError && <Form.Control.Feedback type="invalid">{passwordError}</Form.Control.Feedback>}
          </Form.Group>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          type="submit"
          className="auth-button etoro-button"
          disabled={loading}
          form="loginForm"
        >
          <img src="https://etoro-cdn.etorostatic.com/images/avatoros/150x150/zz.png"
            alt="eToro"
            height="24"
            style={{ objectFit: 'contain' }}
        /> Log In
          {loading && <Spinner animation="border" size="sm" className="loading-spinner" />}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
