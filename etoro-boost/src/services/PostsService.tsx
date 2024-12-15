import { useState } from "react";
import { getLoginData } from "./LoginData";

// apiService.ts
const domain = process.env.REACT_APP_SERVER_DOMAIN;
let suggestedPostsPrompt: string = '';

export const fetchSuggestedPosts = async (username: string, prompt: string = '') => {
  const response = prompt ? await generateWithPrompt(username, prompt) : await generateWithoutPrompt(username); 
  return response.json();
};

const generateWithPrompt = async (username: string, prompt: string) => {
  return await fetch(`${domain}api/getSuggestedPosts?userName=${username}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    }
  );
}

const generateWithoutPrompt = async (username: string) => {
  return await fetch(`${domain}api/getSuggestedPosts?userName=${username}`);
}

export const setSuggestedPostsPrompt = (prompt: string) => {
  suggestedPostsPrompt = prompt;
}

export const getSuggestedPostsPrompt = () => {
  return suggestedPostsPrompt;
}

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

export const getUserPrompt = async () => {
  const username: string = getLoginData()?.username;
  if (!username) {
    return '';
  }

  const result = await fetch(`${domain}api/getSuggestedPostsPrompt?userName=${username}`)
  return result.json();
}