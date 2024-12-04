require("dotenv-safe").config();
const passport = require("passport");
const axios = require('axios');
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require("uuid");
const cors = require('cors');
const bodyParser = require("body-parser");
const port = process.env.PORT || 4000;
const TwitterStrategy = require("passport-twitter").Strategy;
const session = require("express-session");
const authRoutes = require('./routes/auth');
const { TwitterApi } = require('twitter-api-v2');

const AIType = {
	AzureOpenAI: "AzureOpenAI",
	XAI: "XAI"
}

const USE_AI = AIType.XAI;
let instruments = [];
let mapUserToToken = {};
const app = express();

const { X_API_KEY, X_API_SECRET, X_ACCESS_SECRET, CALLBACK_URL, CALLBACK_DOMAIN } = process.env;

app.use(cors({ origin: process.env.CALLBACK_DOMAIN, credentials: true }));
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', authRoutes);
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json('hello etoro boost');
});

// Middleware setup
app.use(session({
  secret: "twitter-auth-secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
})
);
app.use(passport.initialize());
app.use(passport.session());

passport.use(new TwitterStrategy(
    {
      consumerKey: X_API_KEY,
      consumerSecret: X_API_SECRET,
      callbackURL: CALLBACK_URL
    },
    (token, tokenSecret, profile, done) => {
      // Store user profile for session
      return done(null, { profile, token, tokenSecret });
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));



app.get("/auth/twitter", passport.authenticate("twitter"));

app.get("/auth/twitter/callback", passport.authenticate("twitter", { failureRedirect: "/" }),
  (req, res) => {
    try {
      const user = req.user.profile.displayName;
      mapUserToToken = {};
      mapUserToToken[req.session.id] = {
        token: req.user.token,
        tokenSecret: req.user.tokenSecret
      }
      res.redirect(`${CALLBACK_DOMAIN}/dashboard`);
    } catch (err) {
      res.status(500).send("Internal Server Error");
    }
  }
);

// Example route to get current user info
app.get("/auth/user", (req, res) => {
  const filteredObject = Object.fromEntries(
    Object.entries(req.sessionStore.sessions).filter(([key, value]) => value.includes('passport'))
  );
  if (Object.keys(filteredObject)?.length > 1) {
    res.json("Object.keys(filteredObject)?.length > 1");
    return;
  }
  const key = Object.keys(filteredObject)[0];
  
  if (mapUserToToken[key]) {
    console.log('SUCCESS',req.session.id )
    res.json(req.session.id);
  } else {
    console.log(mapUserToToken)
    res.status(401).json({ error: "Unauthorized" });
  }
});

async function fetchPortfolioData(userName) {
  try {
    const portfolioSummaryResponse = await axios.get(`${process.env.ETORO_API_URL}API/User/V1/${userName}/PortfolioSummary`,
      { headers: { 'Ocp-Apim-Subscription-Key': process.env.ETORO_API_KEY } }
    );
    return portfolioSummaryResponse.data;
  } catch (e) {
    console.log(`Failed to fetch portfolio data for ${userName}: `, e.message);
    return null;
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
  const userId = loginDetails.realCustomerId;
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
  const url = `${process.env.ETORO_API_URL}api/feeds/v1/feed?path=discussion&subscription-key=${process.env.ETORO_API_KEY}`
  return await axios.post(url,
    body,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.ETORO_API_KEY,
        'x-token': loginDetails[`token`],
        'x-csrf-token': loginDetails[`xCsrfToken`] 
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

async function generatePostsByAI(content) {
  const prompt = `${content}. The result should be in the following template: 1. split the results by delimiter "*****". 2. don't add any additional text except of the 5 suggestions`;
  let result = [];
  let response;

  try {
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
        // const regex = /\n\n\*\*\*\*\*\n\n\d+. /;
        // const regex = /\n\n\*\*\*\*\*\n\n/;

        // /\n\*\*\*\*\*\n3. d+. /
        let contentSplit = content?.split(`\n*****\n`);
        if (contentSplit?.length > 5) {
          contentSplit = contentSplit?.slice(1, contentSplit.length);
        } else if (contentSplit?.length < 5) {
          contentSplit = content?.split(` *****\n\n`);
        }
        const arr = contentSplit?.filter(element => element !== null && element !== undefined && element !== "");;
        result = arr.concat(result);
        // console.log(`Choice ${choice.index}: ${choice?.message?.content}`);
      }
    }
  } catch (e) {  
    console.error('Failed to get suggested posts ', JSON.stringify(e));
  }
  // const transformedText = await transformTextByOpenAI(prompt);
  return result;
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
  const userName = req.query.username;
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
  const userName = req.query.username;
  const loginDetails = req.body.loginData; // TODO move to headers

  try {  
    const gcid = await getGCID(userName);
    const content = req.body.content;
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
        message: content,
        attachments: []
      }
    }
    
    const result = await postOnEtoroFeedByLoginDetails(loginDetails, body);
    res.json({ result });
  } catch (e) {
    res.json({ e });
    console.error('Failed to get eToro feed ', JSON.stringify(e));
  }
});

app.post('/api/getSuggestedPosts', async(req, res) => {
  const prompt = req?.body?.prompt;
  if (prompt === undefined || prompt === "" || prompt === null) {
    res.json({ result: "Invalid prompt"});
  }
  let result = [];
  try {

    result = await generatePostsByAI(prompt);
  } catch (error) {
    console.error('Error in POST getSuggestedPosts:', error);
    res.json({ error: error.message });
    return;
  } 
  console.log(`Suggested Posts Based On user prompt:\n${result}`);
  result.forEach(res => console.log(res));
  res.json({ result });
});

app.get('/api/getSuggestedPosts', async(req, res) => {
  const userName = req.query.userName;
  if (userName === undefined) {
    res.json({ error: "Invalid input: userName"});
    return;
  }
  let result = [];
  try {
    const portfolioData = await fetchPortfolioData(userName);   
    const positionsText = portfolioData?.positions.map((pos) => {
      const symbol = (instruments).find((element) => element.instrumentId === pos.instrumentId);
      return `${symbol?.ticker}: ${pos.valuePctUnrealized}`;
    });

    const positionsPrompt = (positionsText !== undefined) ? ` This is my portfolio percent allocation per asset: ${positionsText.join(', ')}` : "";

    const prompt = `Create 5 engaging and concise tweets for traders or investors audience about the latest assets. 
    Use an enthusiastic and professional tone, include 1-2 cashtags per post, and aim to spark conversations Make the text eye-catching. 
    The tweet should contain current asset prices and references to: news, articles, financial reports from the last 24 hours.
    don't return any prices. 
    try to generate at least one poll about market changes. add @eToro in the end of each post.${positionsPrompt}`;

    result = await generatePostsByAI(prompt);
    
    
  } catch (error) {
    console.error('Error connecting to Twitter API:', error);
    res.json({ error: error.message });
    return;
  }
  console.log(`Suggested Posts Based On ${userName} Portfolio: \n${result}`);
  result.forEach(res => console.log(res));
  res.json({ result });
});

/* app.get('/api/getTweetsFromX', async(req, res) => {
  let result = [];
  const { token, tokenSecret } = req.user;
  try {
    // if (!req.isAuthenticated()) { TODO
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // } else {
    //   res.json(req.user);
    // }

    const filteredObject = Object.fromEntries(
      Object.entries(req.sessionStore.sessions).filter(([key, value]) => value.includes('passport'))
    );
    const key = Object.keys(filteredObject)[0];
    const accessToken = mapUserToToken[key].token;
    const accessSecret = mapUserToToken[key].tokenSecret;

    // const xToken = res.req.session.passport.user.token;
    // const xTokenSecret = res.req.session.passport.user.tokenSecret;
    const client = new TwitterApi({
      appKey: X_API_KEY,
      appSecret: X_API_SECRET,
      accessToken,
      accessSecret,
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
}); */

app.post('/api/postOnX', async(req, res) => {
  const content = req?.body?.content;
  if (content === undefined || content === "" || content === null) {
    res.json({ result: "Invalid content"});
  }
  try {
    let accessToken, accessSecret;
    const filteredObject = Object.fromEntries(
      Object.entries(req.sessionStore.sessions).filter(([key, value]) => value.includes('passport'))
    );
    
    if (Object.keys(filteredObject)?.length > 1) {
      res.json("Object.keys(filteredObject)?.length > 1");
      return;
    }

    const key = Object.keys(filteredObject)[0];
    accessToken = mapUserToToken[key].token;
    accessSecret = mapUserToToken[key].tokenSecret;

    // if (req.isAuthenticated()) {
    //   xToken = res.req.session.passport.user.token;
    //   xTokenSecret = res.req.session.passport.user.tokenSecret;
    //   // res.json(req.user);
    // } else {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    const client = new TwitterApi({
      appKey: X_API_KEY,
      appSecret: X_API_SECRET,
      accessToken,
      accessSecret
    });
    let response;
    if (content?.includes("Poll Time!")) {
      const contentSplit = content?.split(`\r\n   - `);
      const text = contentSplit[0];
      const options = contentSplit?.slice(1, contentSplit.length);
      response = await client.v2.tweet({
          text,
          poll: {
            duration_minutes: 1440, // Poll duration in minutes (maximum is 1440 minutes / 24 hours)
            options
          },
        })
        .then((response) => {
          res.send(`Tweeted: ${response.data.text}`);
          return "success";
        })
        .catch((err) => {
          res.status(500).send(`Error: ${err.message}`);
          return "failed";
        });
    } else {
      response = await client.v2.tweet(content)
      .then((response) => {
        // res.send(`Tweeted: ${response?.data?.text}`);
        return "Tweet created";
      })
      .catch((err) => {
        // res.status(500).send(`Error: ${err.message}`);
        // res.send(`failed`); // TODO 
        return `Tweet failed: ${err?.data?.title}`;
      });
    }
    res.json({ result: response});
  } catch (error) {
    const errMsg = `Error creating tweet: ${error.response?.data ? JSON.stringify(error.response?.data) : JSON.stringify(error.message)}`;
    console.error(errMsg);
    res.json({ result: errMsg });
  }
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