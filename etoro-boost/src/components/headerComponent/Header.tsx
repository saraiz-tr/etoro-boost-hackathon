import React, { useEffect, useState } from 'react';
//import './HeaderComponent.css';

const HeaderComponent: React.FC = () => {
  const [data, setData] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:4000')
      .then(response => response.json())
      .then(data => {
        setData(data);
      })
      .catch(error => {
        console.error('There was an error making the request!', error);
      });
  }, []);

  return (
    <header>
      <h1>Data from server:</h1>
      <p>{data}</p>
    </header>
  );
};

export default HeaderComponent;