// EditPrompt.tsx
import React, { useRef, useEffect } from 'react';
import './EditPrompt.css';
import { getUserPrompt, setSuggestedPostsPrompt } from '../../services/PostsService';
import { isAuthenticated } from '../../services/LoginData';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';

const EditPrompt: React.FC = () => {
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
      });
    });
  }, []);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      requestAnimationFrame(() => {
        textareaRef.current!.style.height = `${textareaRef.current!.scrollHeight + 20}px`;
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
          // className="auth-button etoro-button"
          className="btn btn-primary generate-posts-button"
          // disabled={loading}
          onClick={handleGeneratePosts}
        >
          Generate Posts
        </Button>
      {/* <button
        className="btn btn-primary generate-posts-button"
        onClick={handleGeneratePosts}
      >
        Generate Posts
      </button> */}
    </div>
  );
};

export default EditPrompt;