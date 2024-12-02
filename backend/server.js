require("dotenv-safe").config();
const axios = require('axios');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require("uuid");
const cors = require('cors');
const port = process.env.PORT || 4000;
const AIType = Object.freeze({
  AZURE_OPENAI: 'AzureOpenAI',
  XAI: 'XAI',
});
const USE_AI = AIType.AzureOpenAI;
let instruments = [];

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json('hello etoro boost');
});

async function fetchPortfolioData(userId) {
  try {
    const portfolioSummaryResponse = await axios.get(`${process.env.ETORO_API_URL}API/User/V1/${userId}/PortfolioSummary`,
      { headers: { 'Ocp-Apim-Subscription-Key': process.env.ETORO_API_KEY } }
    );
    return portfolioSummaryResponse.data;
  } catch (e) {
    throw new Error(`Failed to fetch portfolio data for ${userId}: `, e.message);
  }
}

async function getGCID(username) {
  return await axios
    .request({
      method: "get",
      maxBodyLength: Infinity,
      url: `https://helpers.bullsheet.me/api/gcid?username=${username}`,
    })
    .then((response) => {
      console.log(JSON.stringify(response.data));
      return response?.data?.gcid;
    })
    .catch((error) => {
      console.log(error);
    });
}

async function getEtoroFeedByLoginDetails(loginDetails) { 
  const subscriptionKey = "031656c593ef4e2499d9a2e19d561d4c";
  const userId = loginDetails.demoCustomerId;// deep news "24563762";
  const path = `user%2Ftop%2F${userId}?requesterUserId=${userId}%26take=10%26offset=0%26reactionsPageSize=10`;
  const url = `${process.env.ETORO_API_URL}api/feeds/v1/feed?subscription-key=${subscriptionKey}&path=${path}`
 
  return await axios
    .request({
      method: "get",
      maxBodyLength: Infinity,
      url,
      headers: { 
        'Ocp-Apim-Subscription-Key': process.env.ETORO_API_KEY,
        'x-token': loginDetails[`x-token`],
        'x-csrf-token': loginDetails[`x-csrf-token`] 
      }
    })
    .then((response) => {
      return response?.data?.data;
    })
    .catch((error) => {
      console.log(error);
    });
}

async function postOnEtoroFeedByLoginDetails(loginDetails, body) {   
  const url = `${process.env.ETORO_API_URL}api/feeds/v1/feed?path=discussion`
  return await axios.post(url,
    body,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.ETORO_API_KEY,
        'x-token': loginDetails[`x-token`],
        'x-csrf-token': loginDetails[`x-csrf-token`] 
      }
    }
  )
  .then((response) => {
    return "success";
  })
  .catch((error) => {
    console.log(error);
  });
}

async function getEtoroFeedByGCID(gcid) {
  const clientRequestId = uuidv4();
  const url = `${process.env.ETORO_API_GATEWAY}feed/user/all/${gcid}?take=10&offset=0&reactionsPageSize=10&client_request_id=${clientRequestId}`;
  return await axios
    .request({
      method: "get",
      maxBodyLength: Infinity,
      url
    })
    .then((response) => {
      console.log(JSON.stringify(response.data));
      return response.data;
    })
    .catch((error) => {
      console.log(error);
    });
}

app.get('/api/getPostsFromEtoro', async(req, res) => {
  const userName = req.query.userId;
  const password = req.query.password;
  try {
    const gcid = await getGCID(userName);
    const eToroFeed = await getEtoroFeedByGCID(gcid);
    const result = eToroFeed?.discussions?.map(item => item?.post?.message?.text)
      .filter(element => element !== null && element !== undefined && element !== "");;
    console.log(`eToro feed for user ${userName}: ${eToroFeed}`);
    res.json({ result });
  } catch (e) {
    res.json({ e });
    console.error('Failed to get eToro feed ', JSON.stringify(e));
  }
});

app.post('/api/postsOnEtoro', async(req, res) => {
  const userName = req.query.userId;
  const loginDetails = req.query.loginDetails; //await loginEtoroAccount(userName, password);

  try {  
    const gcid = await getGCID(userName);
    const content  = req.body.content;
    let body = {};
    
    if (content?.includes("Poll Time!")) {
      // TODO return: Poll is currently not supported
      const contentSplit = content?.split(`\r\n   - `);
      const text = contentSplit[0];
      let optionsInput = contentSplit?.slice(1, contentSplit.length);
      const options = optionsInput?.map((option) => {
        return {
          // "id": 0,
          // "index": 1,
          text: option,
          // "isUserVoted": false,
          // "votesCount": 0
        };
    })
      body = {
        owner: gcid,
        message: content,
        poll: {
          title: content,
          options
        }

      }
    } else {
      body = {
        owner: gcid,
        message: content
      }
    }
    
    const result = await postOnEtoroFeedByLoginDetails(loginDetails, body);
    res.json({ result });
  } catch (e) {
    res.json({ e });
    console.error('Failed to get eToro feed ', JSON.stringify(e));
  }
});

app.get('/api/getSuggestedPosts', async(req, res) => {
  const userId = req.query.userId;
  let result = [];
  try {
    const portfolioData = await fetchPortfolioData(userId);   
    const positionsText = portfolioData.positions.map((pos) => {
      const symbol = (instruments).find((element) => element.instrumentId === pos.instrumentId);
      return `${symbol?.ticker}: ${pos.valuePctUnrealized}`;
    });
  
    const prompt = `Create 5 engaging and concise tweets for traders or investors audience about the latest assets. 
    Use an enthusiastic and professional tone, include 1-2 cashtags per post, and aim to spark conversations Make the text eye-catching. 
    The tweet should contain current asset prices and references to: news, articles, financial reports from the last 24 hours. 
    try to generate at least one poll about market changes. add @eToro in the end of each post.
    This is my portfilio percent allocation per asset: ${positionsText.join(', ')}`;
    // const transformedText = await transformTextByOpenAI(prompt);
    let response;
    switch (USE_AI) {
      case "XAI":
        response= await axios.post(process.env.XAI_URL,
          {
            messages: [
              {
                role: 'system',
                content: 'You are Grok, a chatbot inspired by the Hitchhikers Guide to the Galaxy.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            model: 'grok-beta',
            stream: false,
            temperature: 0
          },
          {
            headers: {
              "Content-Type": 'application/json',
              Authorization: 'Bearer ' + process.env.XAI_API_KEY
            }
          }
        );
        break;
      default: //AzureOpenAI
        const endpoint = process.env.AZURE_OPENAI_URL;
        const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
        const apiVersion = "2024-02-15-preview";
        response = await axios.post(`${endpoint}/openai/deployments/${deploymentId}/completions?api-version=${apiVersion}`, 
          {
            messages: [
              {
                role: "system",
                content: [{
                  "type": "text",
                  "text": "You are an AI assistant that helps people find information."
                }]
              },
              {
                role: "user",
                content: [{
                  "type": "text",
                  "text": prompt
                }]
              }
            ],
            top_p: 0.95,
            max_tokens: 800,
            stream: false,
            temperature: 0.7,
          }, 
          {
            headers: {
              "api-key": process.env.AZURE_OPENAI_API_KEY,
              "Content-Type": "application/json"
            }
          });            
          break;
    }
    
    if (response.status === 200) {
      for (const choice of response.data.choices) {
        const content = `\n\n${choice?.message?.content}`;
        const regex = /\n\n\d+. /; ///\*\*Tweet \d+:\*\*\n/;  
        const contentSplit = content?.split(regex)
        const arr = contentSplit?.filter(element => element !== null && element !== undefined && element !== "");;
        result = arr.concat(result);
        // console.log(`Choice ${choice.index}: ${choice?.message?.content}`);
      }
    }
  } catch (error) {
    console.error('Error connecting to Twitter API:', error);
    res.json({ error: error.message });
    return;
  }
  console.log(`Suggested Posts Based On ${userId} Portfolio: \n${result}`);
  result.forEach(res => console.log(res));
  res.json({ result });
});

/**
 * GET getTweetsFromX
 * @param token
 * @param tokenSecret
 */
app.get('/api/getTweetsFromX', async(req, res) => {
  let result = [];
  const { token, tokenSecret } = req.user;
  try {
    const client = new TwitterApi({
      appKey: TWITTER_API_KEY,
      appSecret: TWITTER_API_SECRET,
      accessToken: token,
      accessSecret: tokenSecret,
    });

    const tweets = await client.v2.userTimelineByUsername(username, {
      max_results: 5, // Number of tweets to fetch (max 100)
      "tweet.fields": ['created_at', 'text'], // Optional: fields you want to fetch
    });
    
    // Log the tweets
    console.log(tweets.data);

    // const userName = req.query.userName;
    // const userId = await getXUserId(userName);
    // const tweets = await getUserTweets(userId);
    // console.log(`Tweets from ${userName}:`);
    tweets.forEach(tweet => {
      result.push({
        [tweet.created_at]: tweet.text
      })
      console.log(`- ${tweet.created_at}: ${tweet.text}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.json({ error:  error.message});
    return;
  }
  res.json({ result });
});

app.listen(port, async() => {
  const instrumentsResponse = await axios.get(`${process.env.ETORO_API_URL}Metadata/V1/Instruments`,
    { headers: { 'Ocp-Apim-Subscription-Key': process.env.ETORO_API_KEY } }
  );
  if (instrumentsResponse.status === 200) {
    instruments = instrumentsResponse.data;
  } else {
    throw new Error('Failed to fetch stock instruments ', instrumentsResponse.status);
  }
  console.log(`Server is running on http://localhost:${port}`);
});