import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { LoginModal } from '../LoginModalComponent/LoginModal';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../../styles/style.css';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, setLoginData } from '../../services/LoginData';

export const Login = () => {
  const [showEtoroModal, setShowEtoroModal] = useState(false);
  const [etoroLoggedIn, setEtoroLoggedIn] = useState(false);
  const navigate = useNavigate();

  const goToDashboard = () => {
    // Check first the both twitter and eToro are logged in
    navigate('/dashboard');
    //alert("is eToro logged in?", isAuthenticated());
  };

  useEffect(() => {
    // Check if the user is logged it
    if (isAuthenticated()) {
      setEtoroLoggedIn(true);
      goToDashboard();
    }
  }, []);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">eToro Boost</h1>
        <p className="auth-subtitle">please login to continue</p>
        
        {/* eToro button container */}
        <div className="button-container">
          <Button 
            className="auth-button etoro-button"
            onClick={() => setShowEtoroModal(true)}
          >
            <img src="https://etoro-cdn.etorostatic.com/images/avatoros/150x150/zz.png"
            alt="eToro"
            height="24"
            style={{ objectFit: 'contain' }}/>
            eToro
          </Button>
          {etoroLoggedIn && (
            <span className="success-indicator">
              {/* <i className="bi bi-check-circle-fill"></i> */}
              <i className="bi bi-check-circle-fill"></i> {/* Bootstrap icon */}
            </span>
          )}
        </div>

        <LoginModal 
          show={showEtoroModal}
          onHide={() => setShowEtoroModal(false)}
          onLoginSuccess={(token: string, xCsrfToken: string, username: string) => {
            setLoginData({ token, xCsrfToken, username });
            setEtoroLoggedIn(true);
            goToDashboard();
          }}
        />
      </div>
    </div>
  );
}

interface LoginData {
    token: string;
    xCsrfToken: string;
    username: string;
}