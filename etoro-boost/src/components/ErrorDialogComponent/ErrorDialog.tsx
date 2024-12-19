// etoro-boost/src/components/ErrorDialog.tsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './ErrorDialog.css';

interface ErrorDialogProps {
  show: boolean;
  onHide: () => void;
  errorMessage: string;
}
const ErrorDialog: React.FC<ErrorDialogProps> = ({ show, onHide, errorMessage }) => {
  const navigate = useNavigate();
  const handleOkClick = () => {
    //navigate('/login');
    onHide();
  };
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header className="justify-content-between">
        <Modal.Title>Error</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{errorMessage}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary ok-button" onClick={handleOkClick}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
export default ErrorDialog;