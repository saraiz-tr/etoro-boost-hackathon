import React, { useEffect, useState } from 'react';
//import './HeaderComponent.css';

const DashboardComponent: React.FC = () => {
  const [data, setData] = useState<string>('');

//   useEffect(() => {
//     fetch('http://localhost:4000')
//       .then(response => response.json())
//       .then(data => {
//         setData(data);
//       })
//       .catch(error => {
//         console.error('There was an error making the request!', error);
//       });
//   }, []);

  return (
    <div>
      <h1>Dashboard :)</h1>
    </div>
  );
};

export default DashboardComponent;