import React from 'react';
import { Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Loader.css'; // Create CSS for center alignment

const Loader: React.FC = () => {
  return (
    <div className="loader-container">
      <Spinner animation="border" variant="light" />
    </div>
  );
};

export default Loader;