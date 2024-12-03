import React, { useEffect, useState } from 'react';
import { getLoginData } from '../../services/LoginData';
import { Button } from 'react-bootstrap';
//import './HeaderComponent.css';

const DashboardComponent: React.FC = () => {
  const [data, setData] = useState<string>('');

  const postToX = () => {
    fetch('http://localhost:4000/api/postOnX', { 
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      }, 
      body: JSON.stringify({
        content: 'hello world'
      })
    })    
  };

  useEffect(() => {
    const username = getLoginData()?.username;
    fetch(`http://localhost:4000/api/getSuggestedPosts?userName=${username}`)
      .then(response => response.json())
      .then(data => {
        console.log("result", data);
        setData(data);
      })
      .catch(error => {
        console.error('There was an error making the request!', error);
      });
  }, []);

  return (
    <div>
      <h1>Dashboard :)</h1>

      <Button onClick={postToX}></Button>
    </div>
  );
};

export default DashboardComponent;