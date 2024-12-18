// Layout.tsx
import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import './Layout.css';
import { logout } from '../../services/LoginData';
//import Cookies from 'js-cookie';

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Clear cookies or local storage
    //Cookies.remove('twitterToken');
    //Cookies.remove('twitterTokenSecret');
    //Cookies.remove('twitterUsername');
    // Redirect to login page
    navigate('/login');
    logout();
  };

  // Hide the logout button on the login page
  if (location.pathname === '/login') {
    return <Outlet />;
  }

  return (
    <div className="bg-dark layout">
        <div className="layout-button-container">
            <button type="button" className="btn btn-link" onClick={handleLogout}>
                Logout
            </button>
        </div>
      <Outlet />
    </div>
  );
};

export default Layout;