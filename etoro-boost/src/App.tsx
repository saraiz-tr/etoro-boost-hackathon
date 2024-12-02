import React from 'react';
import logo from './logo.svg';
import './App.css';
import HeaderComponent from './components/headerComponent/Header';
import { Login } from './components/LoginComponent/Login';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DashboardComponent from './components/DashboardComponent/Dashboard';

function App() {
  return (
    <Router>
      <div>
        <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<DashboardComponent />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
