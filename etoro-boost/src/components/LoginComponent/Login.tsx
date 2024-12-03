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

  const handleLoginX = async () => {
    // Redirect to the Twitter authentication route on the server
    window.location.href = "http://localhost:4000/auth/twitter";
    // const result = await fetch('http://localhost:4000/auth/twitter');
    // const res = result.json();
    // console.log('res', res);
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
        <img className="etoro-logo" src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/logo.png"/>
        <div className="logo-title-container">
          <img className="etoro-boost-icon" src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/etoro-boost-icon.svg"/>
          <h1 className="auth-title">BOOST</h1>
        </div>
        <p className="auth-subtitle">please login to eToro & X to continue</p>
        
        {/* eToro button container */}
        <div className="button-container">
          <Button 
            className="auth-button etoro-button"
            onClick={() => setShowEtoroModal(true)}
          >
            <img src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/etoro-logo-small.svg"
            alt="eToro"
            height="24"
            style={{ objectFit: 'contain' }}/>
            eToro
            {etoroLoggedIn && (
              <span className="success-indicator">
                {/* <i className="bi bi-check-circle-fill"></i> */}
                <i className="bi bi-check-circle-fill"></i> {/* Bootstrap icon */}
              </span>
            )}
          </Button>
          
          <Button 
            className="auth-button twitter-button"
            onClick={handleLoginX} 
          >
            <img src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/x-logo.svg"
            alt="X"
            height="15"
            style={{ objectFit: 'contain' }}/>
            Login With X
          </Button>
        </div>

        <LoginModal 
          show={showEtoroModal}
          onHide={() => setShowEtoroModal(false)}
          onLoginSuccess={(token: string, xCsrfToken: string, username: string) => {
            setLoginData({ token, xCsrfToken, username });
            setEtoroLoggedIn(true);
            // goToDashboard();
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