// EditModal.tsx
import React from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { ChevronLeft } from 'react-bootstrap-icons';
import './EditModal.css';

interface EditModalProps {
  showModal: boolean;
  selectedTweet: string | null;
  selectedPlatforms: string[];
  isPostDisabled: boolean;
  handleClose: () => void;
  handlePost: () => void;
  handlePlatformSelect: (platform: string) => void;
  setSelectedTweet: (tweet: string) => void;
  errorMessage: string | null; // Add error message prop
  loading: boolean;
}

const EditModal: React.FC<EditModalProps> = ({
  showModal,
  selectedTweet,
  selectedPlatforms,
  isPostDisabled,
  handleClose,
  handlePost,
  handlePlatformSelect,
  setSelectedTweet,
  errorMessage,
  loading // Add the loading prop
}) => {
  return (
    <Modal
      show={showModal}
      onHide={handleClose}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header>
        <button
          className="close-modal-btn btn btn-link"
          onClick={handleClose}
          aria-label="Close"
        >
          <ChevronLeft />
        </button>
        <Modal.Title>Edit Post</Modal.Title>
        <Button
          variant="primary"
          onClick={handlePost}
          disabled={isPostDisabled || loading}  // Disable if loading
          className="mobile post-button ml-auto"
        >
          {loading ? <Spinner animation="border" size="sm" /> : 'Post'}
        </Button>
      </Modal.Header>
      <Modal.Body>
        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
        <textarea
          value={selectedTweet || ""}
          onChange={(e) => setSelectedTweet(e.target.value)}
          className="form-control"
          rows={10}
        />
        <hr />
        <h5 className="mt-2">Post in</h5>
        <div className="mb-3">
          <div className="buttons-container">
            <button
              type="submit"
              className={`network-button  ${selectedPlatforms.includes("eToro") ? "btn-light-green" : ""} btn-primary mx-2`}
              onClick={() => handlePlatformSelect("eToro")}
            >
              <span>eToro</span>
              <div className="button-icon">
                {selectedPlatforms.includes("eToro") ? (
                  <i className="bi bi-x-circle"></i>
                ) : (
                  <i className="bi bi-plus-circle"></i>
                )}
              </div>
            </button>
            <button
              type="submit"
              className={`network-button  ${selectedPlatforms.includes("X") ? "btn-light-green" : ""} btn-primary mx-2`}
              onClick={() => handlePlatformSelect("X")}
            >
              <span>X</span>
              <div className="button-icon">
                {selectedPlatforms.includes("X") ? (
                  <i className="bi bi-x-circle"></i>
                ) : (
                  <i className="bi bi-plus-circle"></i>
                )}
              </div>
            </button>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="desktop">
        <Button
          variant="secondary"
          onClick={handleClose}
          className="cancel-button"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handlePost}
          disabled={isPostDisabled || loading} // Disable if loading
          className="post-button"
        >
          {loading ? <Spinner animation="border" size="sm" /> : 'Post'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditModal;