import { getLoginData } from "./LoginService";
import { v4 as uuidv4 } from 'uuid';

const domain = process.env.REACT_APP_SERVER_DOMAIN;
let suggestedPostsPrompt: string = '';

export const fetchSuggestedPosts = async (username: string, prompt: string = '') => {
  const response = prompt ? await generateWithPrompt(username, prompt) : await generateWithoutPrompt(username);
  if(!response.ok) {
    throw new Error("Failed to fetch suggested posts");
  }
  return response.json();
};

export const setSuggestedPostsPrompt = (prompt: string) => {
  suggestedPostsPrompt = prompt;
}

export const getSuggestedPostsPrompt = () => {
  return suggestedPostsPrompt;
}

export const postToX = async (post: any) => {
  const requestId = uuidv4(); 
  const response = await fetch(`${domain}api/postOnX?client_request_id=${requestId}`, { 
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json'
    }, 
    body: JSON.stringify({
      content: post
    }),
    credentials: 'include'
  });
  if(!response.ok) {
    throw new Error("Failed to post to X");
  }
  return response.json();
};

export const postToEtoro = async (post: any, loginData: any) => {
  const username: string = loginData.username;
  const requestId = uuidv4();  // e.g., "
  const response = await fetch(`${domain}api/postsOnEtoro?username=${username}&client_request_id=${requestId}`, {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
      'token': loginData.token,
      'xCsrfToken': loginData.xCsrfToken 
    }, 
    body: JSON.stringify({
      content: post
    }),
    credentials: 'include'
  });
  if(!response.ok) {
    throw new Error("Failed to post to eToro");
  }
  return response.json();
};

export const getUserPrompt = async () => {
  const username: string = getLoginData()?.username;
  const requestId = uuidv4(); 
  if (!username) {
    return {};
  }

  const result = await fetch(`${domain}api/getSuggestedPostsPrompt?userName=${username}&client_request_id=${requestId}`, {
    credentials: 'include'
  })
  return result.json();
}

// Private methods
const generateWithoutPrompt = async (username: string) => {
  const requestId = uuidv4(); 
  return await fetch(`${domain}api/getSuggestedPosts?userName=${username}&client_request_id=${requestId}`, {
    credentials: 'include'
  });
}

const generateWithPrompt = async (username: string, prompt: string) => {
  const requestId = uuidv4(); 
  return await fetch(`${domain}api/getSuggestedPosts?userName=${username}&client_request_id=${requestId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt }),
      credentials: 'include' // Include cookies in the request
    }
  );
}