// EditPrompt.tsx
import React, { useRef, useEffect } from 'react';
import './EditPrompt.css';

const EditPrompt: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight();
    }
  }, []);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; // 200px is the max height
    }
  };

  return (
    <div className="bg-dark edit-prompt-container">
      <h1>Edit Prompt</h1>
      <textarea
        ref={textareaRef}
        onChange={adjustTextareaHeight}
        className="form-control"
        rows={10}
        style={{ maxHeight: '200px', overflow: 'auto' }} // 200px is the max height
      />
      <button className="btn btn-primary generate-posts-button">Generate Posts</button>
    </div>
  );
};

export default EditPrompt;