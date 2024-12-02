import React, { useEffect, useState } from 'react';
import { getLoginData } from '../../services/LoginData';
//import './HeaderComponent.css';

const DashboardComponent: React.FC = () => {
  const [data, setData] = useState<string>('');

  useEffect(() => {
    const username = getLoginData()?.username;
    fetch(`http://localhost:4000/api/getSuggestedPosts?userId=${username}`)
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
    </div>
  );
};

export default DashboardComponent;