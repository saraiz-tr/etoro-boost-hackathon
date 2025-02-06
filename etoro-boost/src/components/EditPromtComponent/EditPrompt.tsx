// EditPrompt.tsx
import React, { useRef, useEffect, useState } from 'react';
import './EditPrompt.css';
import { getUserPrompt, setSuggestedPostsPrompt } from '../../services/PostsService';
import { isAuthenticated } from '../../services/LoginService';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import ErrorDialog from '../ErrorDialogComponent/ErrorDialog';

const EditPrompt: React.FC = () => {
  const [showErrorDialog, setShowErrorDialog] = useState(false); // Error dialog state
  const [errorMessage, setErrorMessage] = useState(""); // Error message state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    init()
    .then(() => {
      getUserPrompt()
      .then((prompt) => {
        // Set the prompt in the textarea
        textareaRef.current!.value = prompt.result;
        adjustTextareaHeight();
      })
      .catch(() => {
        setErrorMessage("There was an error fetching the prompt. You can use your own imigintion and write your own prompt ;)");
        setShowErrorDialog(true);
      });
    });
  }, []);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      requestAnimationFrame(() => {
        const currentHeight = textareaRef.current!.style.height ? parseInt(textareaRef.current!.style.height) : 0;
        const scrollHeight = textareaRef.current!.scrollHeight;
        if (!currentHeight || scrollHeight > currentHeight) {
          textareaRef.current!.style.height = `${textareaRef.current!.scrollHeight}px`;
        }
      });
    }
  };

  const init = async () => {
    const isUserAuthenticated = await isAuthenticated();
    if (!isUserAuthenticated) {
      navigate('/login');
      return;
    }
  }

  const handleGeneratePosts = async () => {
    setSuggestedPostsPrompt(textareaRef.current!.value);
    navigate('/dashboard');
  }

  return (
    <div className="bg-dark edit-prompt-container">
      <h1>Edit Prompt</h1>
      <textarea
        ref={textareaRef}
        onChange={adjustTextareaHeight}
        className="form-control prompt-textarea"
        rows={10}
      />
      <Button
          type="submit"
          className="btn btn-primary generate-posts-button"
          onClick={handleGeneratePosts}
        >
          Generate Posts
      </Button>

      <ErrorDialog // Include the error dialog here
          show={showErrorDialog}
          onHide={() => setShowErrorDialog(false)}
          errorMessage={errorMessage}
        />
        
    </div>
  );
};

export default EditPrompt;