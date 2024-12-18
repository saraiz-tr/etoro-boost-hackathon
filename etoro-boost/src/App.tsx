// App.tsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Layout from './components/LayoutComponent/Layout';
import { Login } from './components/LoginComponent/Login';
import DashboardComponent from './components/DashboardComponent/Dashboard';
import EditPrompt from './components/EditPromtComponent/EditPrompt';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardComponent />} />
          <Route path="/edit-prompt" element={<EditPrompt />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;