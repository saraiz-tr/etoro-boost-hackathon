import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { LoginModal } from '../LoginModalComponent/LoginModal';
import Loader from '../LoaderComponent/Loader'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../../styles/style.css';
import { useNavigate } from 'react-router-dom';
import { eToroLogin, getIsXLoggedin, getLoginData, isAuthenticated, setLoginData } from '../../services/LoginService';

export const Login = () => {
  const [showEtoroModal, setShowEtoroModal] = useState(false);
  const [etoroLoggedIn, setEtoroLoggedIn] = useState(false);
  const [xLoggedIn, setXLoggedIn] = useState<boolean | undefined>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const domain = process.env.REACT_APP_SERVER_DOMAIN;

  const goToDashboard = () => {
    // Check first the both twitter and eToro are logged in
    navigate('/edit-prompt');
  };

  const handleLoginX = async () => {
    // Redirect to the Twitter authentication route on the server
    window.location.href = `${domain}auth/twitter`;
  };

  const autoLogin = async () => {
    setLoading(true); // Start loading
    const isUserAuthenticated = await isAuthenticated();
    setLoading(false); // End loading

    if (isUserAuthenticated) {
      goToDashboard();
    } else {
      setEtoroLoggedIn(!!getLoginData()?.token);
      setXLoggedIn(getIsXLoggedin());
    }
  };

  useEffect(() => {
    // automatic login user who already logged in
    autoLogin();
  }, []);

  return (
    <div className="auth-container">
      {loading && <Loader />}  {/* Display loader if loading */}
      <div className="auth-card">
        <img className="etoro-logo" src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/logo.png" />
        <div className="logo-title-container">
          <img className="etoro-boost-icon" src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/etoro-boost-icon.svg" />
          <h1 className="auth-title">BOOST</h1>
        </div>
        <p className="auth-subtitle">please login to eToro & X to continue</p>
        
        <div className="button-container">
          <Button 
            className="auth-button etoro-button"
            //onClick={() => setShowEtoroModal(true)}
            onClick={async () => {
              const isSuccess = await eToroLogin();
              if (isSuccess) {
                setEtoroLoggedIn(true);
                autoLogin();
              } else {
                // TBD: Show error message
              }
            }}
            disabled={loading}
          >
            <img src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/etoro-logo-small.svg"
              alt="eToro"
              height="24"
              style={{ objectFit: 'contain' }}/>
            eToro
            {etoroLoggedIn && (
              <span className="success-indicator">
                <i className="bi bi-check-circle-fill"></i>
              </span>
            )}
          </Button>
          
          <Button 
            className="auth-button twitter-button"
            onClick={handleLoginX} 
            disabled={loading}
          >
            <img src="https://etoro-cdn.etorostatic.com/web-client/et/img/etoro-boost/x-logo.svg"
              alt="X"
              height="15"
              style={{ objectFit: 'contain' }}/>
            Login With X
            {xLoggedIn && (
              <span className="success-indicator">
                <i className="bi bi-check-circle-fill"></i>
              </span>
            )}
          </Button>
        </div>

        {/* <LoginModal 
          show={showEtoroModal}
          onHide={() => setShowEtoroModal(false)}
          onLoginSuccess={(token: string, xCsrfToken: string, username: string) => {
            setLoginData({ token, xCsrfToken, username, 0 });
            setEtoroLoggedIn(true);
            autoLogin();
          }}
        /> */}
      </div>
    </div>
  );
}