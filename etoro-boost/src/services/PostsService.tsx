// apiService.ts
const domain = process.env.REACT_APP_SERVER_DOMAIN;

export const fetchSuggestedPosts = async (username: string) => {
  const response = await fetch(`${domain}api/getSuggestedPosts?userName=${username}`);
  return response.json();
};

export const postToX = async (post: any) => {
  await fetch(`${domain}api/postOnX`, { 
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json'
    }, 
    body: JSON.stringify({
      content: post
    })
  });
};

export const postToEtoro = async (post: any, loginData: any) => {
  const username: string = loginData.username;
  await fetch(`${domain}api/postsOnEtoro?username=${username}`, { 
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json'
    }, 
    body: JSON.stringify({
      content: post,
      loginData
    })
  });
};

export {};