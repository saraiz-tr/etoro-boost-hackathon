import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Login } from './components/LoginComponent/Login';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import DashboardComponent from './components/DashboardComponent/Dashboard';
import EditPrompt from './components/EditPromtComponent/EditPrompt';

function App() {
  return (
    <Router>
      <div>
        <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/edit-prompt" element={<EditPrompt />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<DashboardComponent />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
