require('dotenv-safe').config();
const express = require('express');
const cors = require('cors');
const axios = require("axios");
const { TwitterApi } = require('twitter-api-v2');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const authRoutes = require("./routes/auth");
const moment = require("moment");
const path = require("path");

const AIType = {
  AzureOpenAI: "AzureOpenAI",
  XAI: "XAI",
};
let mapUserToToken = {};
const USE_AI = AIType.XAI;

const {
  X_API_KEY,
  X_API_SECRET,
  CALLBACK_URL,
  CALLBACK_DOMAIN,
  ETORO_API_URL,
  ETORO_API_KEY,
  XAI_URL,
  XAI_API_KEY,
  AZURE_OPENAI_URL,
  AZURE_OPENAI_DEPLOYMENT_ID,
  X_SESSION_SECRET,
  X_CLIENT_ID,
  X_CLIENT_SECRET
} = process.env;

const PORT = process.env.PORT || 4000;
const CLIENT_URL="http://localhost:3000";

const app = express();
app.use(express.json());

const corsConfig = { origin: process.env.CALLBACK_DOMAIN, credentials: true };
if (process.env.NODE_ENV === "development") {
  corsConfig.origin = true;
}
app.use(cors(corsConfig));

app.use(cookieParser());
app.use(session({
  secret: X_SESSION_SECRET, // This should be an environment variable for security
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true in production for HTTPS
}));
app.use("/api", authRoutes);

const twitterClient = new TwitterApi({
  clientId: X_CLIENT_ID,
  clientSecret: X_CLIENT_SECRET
});

// Authentication endpoint
app.get('/auth/twitter', async (req, res) => {
  const authLink = await twitterClient.generateOAuth2AuthLink(CALLBACK_URL, {
    scope: ["tweet.read", "tweet.write", "users.read"],
  });
  const { url, state, codeVerifier } = authLink;
  req.session.twitterState = state;
  req.session.codeVerifier = codeVerifier;
  console.log("Initiating OAuth flow", { state, callbackUrl: CALLBACK_URL });
  res.redirect(url);
});

// Callback endpoint for OAuth
app.get("/auth/twitter/callback", async (req, res) => {
  const { state, code, error: oauthError } = req.query;
  const sessionState = req.session?.twitterState;

  if (oauthError) {
    console.log("OAuth error from Twitter", { error: oauthError });
    // return res.redirect("/?error=" + encodeURIComponent("Authentication failed")); TODO
  }

  if (!state || !sessionState || state !== sessionState) {
    console.log("Invalid state parameter", { receivedState: state, expectedState: sessionState });
    // return res.redirect("/?error=" + encodeURIComponent("Invalid authentication state")); TODO
  }
  try {
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await twitterClient.loginWithOAuth2({
      code,
      codeVerifier: req.session.codeVerifier,
      redirectUri: CALLBACK_URL,
    });
    console.log("OAuth2 login successful, fetching user details");
    const { data: user } = await loggedClient.v2.me();

    req.session.twitterAccessToken = accessToken;
    // Store session or token here for future requests (using session management or JWT)
    req.session.userId = user.id;
    req.session.userName = user.username;
    req.session.code = code;
    req.session.userClient = loggedClient; 

    const now = Date.now();
    const expirationTime = now + (expiresIn * 1000); // expiresIn: 7200 seconds (ie 2 hours)

    req.session.expirationTime = expirationTime;

    mapUserToToken[user.username] = {
      name: user.name,
      token: accessToken,
      tokenSecret: refreshToken,
      loggedClient,
      expirationTime
    }
    console.log("Authentication successful", { userId: user.username }); 
    
    res.redirect(`${CALLBACK_DOMAIN}login`);
  } catch (error) {
    console.log("Authentication error", { error: error.message }, true);
    // res.redirect("/?error=" + encodeURIComponent("Authentication failed")); TODO
  }
});

app.get("/auth/user", (req, res) => {
  const sessionData = getUserDataFromCookie(req);
  const expirationTime = sessionData?.expirationTime;

  if (expirationTime && moment().isAfter(expirationTime)) {
    res.status(401).json({ error: "User X token expired" });
    return;
}
  const key = sessionData?.userName;
  if (!key) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (mapUserToToken[key]) {
    res.json({ loggedIn: true });
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

async function fetchPortfolioData(userName) {
  try {
    const portfolioSummaryResponse = await axios.get(
      `${process.env.ETORO_API_URL}API/User/V1/${userName}/PortfolioSummary`,
      { headers: { "Ocp-Apim-Subscription-Key": process.env.ETORO_API_KEY } }
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

async function postOnEtoroFeedByLoginDetails(loginDetails, body) {
  const url = `${process.env.ETORO_API_URL}api/feeds/v1/feed?path=discussion&subscription-key=${process.env.ETORO_API_KEY}`;
  return await axios
    .post(url, body, {
      headers: {
        "Ocp-Apim-Subscription-Key": process.env.ETORO_API_KEY,
        "x-token": loginDetails[`token`],
        "x-csrf-token": loginDetails[`xCsrfToken`],
      },
    })
    .then((response) => {
      return "success";
    })
    .catch((error) => {
      console.log(error);
    });
}

async function generatePostsByAI(content) {
  const prompt = `${content}. please return the tweets that you generate as a vaild JSON that is an array. Each elemnet in the array will containt the text of the tweet you generated, and please you can drop the 'here are bla bla that you write in the begeining' please remove the \`\`\`json in the begining and at the end
  before any stock symbol put $ and not #`;
  let result = [];
  let response;

  try {
    switch (USE_AI) {
      case "XAI":
        response = await axios.post(
          process.env.XAI_URL,
          {
            messages: [
              {
                role: "system",
                content:
                  "You are Grok, a chatbot inspired by the Hitchhikers Guide to the Galaxy.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            model: "grok-beta",
            stream: false,
            temperature: 0,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + process.env.XAI_API_KEY,
            },
          }
        );
        break;
      default: //AzureOpenAI
        const endpoint = process.env.AZURE_OPENAI_URL;
        const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
        const apiVersion = "2024-02-15-preview";
        response = await axios.post(
          `${endpoint}/openai/deployments/${deploymentId}/completions?api-version=${apiVersion}`,
          {
            messages: [
              {
                role: "system",
                content: [
                  {
                    type: "text",
                    text: "You are an AI assistant that helps people find information.",
                  },
                ],
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: prompt,
                  },
                ],
              },
            ],
            top_p: 0.95,
            max_tokens: 800,
            stream: false,
            temperature: 0.7,
          },
          {
            headers: {
              "api-key": process.env.AZURE_OPENAI_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );
        break;
    }

    if (response.status === 200) {
      for (const choice of response.data.choices) {
        const content = `${choice?.message?.content}`;
        try {
          const jsonContent = JSON.parse(content);
          result = jsonContent.map((obj) => obj.text);
        } catch (error) {
          console.error("Failed to parse JSON:", error);
        }
      }
    }
  } catch (e) {
    console.error("Failed to get suggested posts ", JSON.stringify(e));
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
      url,
    })
    .then((response) => {
      console.log(JSON.stringify(response.data));
      return response.data;
    })
    .catch((error) => {
      console.log(error);
    });
}

app.get("/api/getPostsFromEtoro", async (req, res) => {
  const userName = req.query.username;
  const password = req.query.password;
  try {
    const gcid = await getGCID(userName);
    const eToroFeed = await getEtoroFeedByGCID(gcid);
    const result = eToroFeed?.discussions
      ?.map((item) => item?.post?.message?.text)
      .filter(
        (element) => element !== null && element !== undefined && element !== ""
      );
    console.log(`eToro feed for user ${userName}: ${eToroFeed}`);
    res.json({ result });
  } catch (e) {
    res.json({ e });
    console.error("Failed to get eToro feed ", JSON.stringify(e));
  }
});

app.post("/api/postsOnEtoro", async (req, res) => {
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
      });
      body = {
        owner: gcid,
        message: content,
        poll: {
          title: content,
          options,
        },
      };
    } else {
      body = {
        owner: gcid,
        message: content,
        attachments: [],
      };
    }

    const result = await postOnEtoroFeedByLoginDetails(loginDetails, body);
    res.json({ result });
  } catch (e) {
    res.json({ e });
    console.error("Failed to get eToro feed ", JSON.stringify(e));
  }
});

app.post("/api/getSuggestedPosts", async (req, res) => {
  const prompt = req?.body?.prompt;
  if (prompt === undefined || prompt === "" || prompt === null) {
    res.json({ result: "Invalid prompt" });
  }
  let result = [];
  try {
    result = await generatePostsByAI(prompt);
  } catch (error) {
    console.error("Error in POST getSuggestedPosts:", error);
    res.json({ error: error.message });
    return;
  }
  // console.log(`Suggested Posts Based On user prompt:\n${result}`);
  // result.forEach((res) => console.log(res));
  res.json({ result });
});

async function getSuggestedPostsPrompt(userName) {
  try {
    const portfolioData = await fetchPortfolioData(userName);
    const positionsText = portfolioData?.positions.map((pos) => {
      const symbol = instruments.find(
        (element) => element.instrumentId === pos.instrumentId
      );
      return `${symbol?.ticker}: ${pos.valuePctUnrealized}`;
    });

    const positionsPrompt =
      positionsText !== undefined
        ? ` This is my portfolio percent allocation per asset: ${positionsText.join(
            ", "
          )}`
        : "";

    const prompt = `Create 5 engaging and concise tweets for traders or investors audience about the latest assets. 
    Use an enthusiastic and professional tone, include 1-2 cashtags per post, and aim to spark conversations Make the text eye-catching. 
    The tweet should contain current asset prices and references to: news, articles, financial reports from the last 24 hours.
    don't return any prices. 
    try to generate at least one poll about market changes. add @eToro in the end of each post.${positionsPrompt}`;

    return prompt;
  } catch (error) {
    console.error("Error connecting to Twitter API:", error);
    res.json({ error: error.message });
    return;
  }
}

app.get("/api/getSuggestedPostsPrompt", async (req, res) => {
  const userName = req.query.userName;
  if (userName === undefined) {
    res.json({ error: "Invalid input: userName" });
    return;
  }
  const result = await getSuggestedPostsPrompt(userName);
  res.json({ result });
});

app.get("/api/getSuggestedPosts", async (req, res) => {
  const userName = req.query.userName;
  if (userName === undefined) {
    res.json({ error: "Invalid input: userName" });
    return;
  }
  let result = [];
  try {
    const prompt = await getSuggestedPostsPrompt(userName);
    result = await generatePostsByAI(prompt);
  } catch (error) {
    console.error("Error connecting to Twitter API:", error);
    res.json({ error: error.message });
    return;
  }
  // console.log(`Suggested Posts Based On ${userName} Portfolio: \n${result}`);
  // result.forEach((res) => console.log(res));
  res.json({ result });
});

function getUserDataFromCookie(req) {
  const sessions = Object.values(req.sessionStore?.sessions);
  const filteredSessions = sessions?.filter((item) => item.includes("twitterState"));

  if (filteredSessions && filteredSessions.length !== 1) {
    // res.status(401).json({ error: "Unauthorized" });
    return null;
  }

  const sessionData = JSON.parse(filteredSessions[0]);
  return sessionData;
}

app.post("/api/postOnX", async (req, res) => {
  const content = req?.body?.content;
  if (content === undefined || content === "" || content === null) {
    res.json({ result: "Invalid content" });
  }
  try {
    const sessionData = getUserDataFromCookie(req);
    const loggedClient = mapUserToToken[sessionData.userName]?.loggedClient;
    const { data: user } = await loggedClient?.v2?.me();
    if (user.username !== sessionData.userName) {
      res.json({ result: `Tweet failed: user.username ${user.username} !== sessionData.userName ${sessionData.userName}` });
      return;
    }

    let response;
    if (content?.includes("Poll Time!")) {
      const contentSplit = content?.split(`\r\n   - `);
      const text = contentSplit[0];
      const options = contentSplit?.slice(1, contentSplit.length);
      
      response = await loggedClient.v2.tweet(text,
          {
            poll: {
              duration_minutes: 1440, // Poll duration in minutes (maximum is 1440 minutes / 24 hours)
              options
          }
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
      response = await loggedClient.v2.tweet(content)
        .then((response) => {
          // res.send(`Tweeted: ${response?.data?.text}`);
          console.log(`${user.username} tweeted: ${content}`);
          return `${user.username} tweeted: ${content}`;
        })
        .catch((err) => {
          // res.status(500).send(`Error: ${err.message}`);
          // res.send(`failed`); // TODO
          return `Tweet failed: ${err?.data?.title}`;
        });
    }
    res.json({ result: response });
  } catch (error) {
    const errMsg = `Error creating tweet: ${
      error.response?.data
        ? JSON.stringify(error.response?.data)
        : JSON.stringify(error.message)
    }`;
    console.error(errMsg);
    res.json({ result: errMsg });
  }
});

// app.get('/api/logout', (req, res) => {
//   req.session.destroy(); // TODO test
//   req.sessionStore.destroy();
//   // TODO clean map
//   res.redirect('/login');
// });

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, "../etoro-boost/build")));

// Handle React routing, return all requests to React app
app.get("*", (req, res) => {
  // This needs to be AFTER your API routes
  res.sendFile(path.join(__dirname, "../etoro-boost/build", "index.html"));
});

app.listen(PORT, '0.0.0.0', async () => {
  const instrumentsResponse = await axios.get(
    `${process.env.ETORO_API_URL}Metadata/V1/Instruments`,
    { headers: { "Ocp-Apim-Subscription-Key": process.env.ETORO_API_KEY } }
  );
  if (instrumentsResponse.status === 200) {
    instruments = instrumentsResponse.data;
  } else {
    throw new Error(
      "Failed to fetch stock instruments ",
      instrumentsResponse.status
    );
  }
  console.log(`Server is running on http://localhost:${PORT}`);
});
