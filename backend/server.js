require("dotenv-safe").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const authRoutes = require("./routes/auth");
const xAuthRoutes = require("./routes/XAuth");
const { TwitterApi } = require("twitter-api-v2");
const AzureOpenAIService = require("./services/AzureOpenAIService");
const EtoroService = require("./services/EtoroService");
const XAIService = require("./services/XAIService");
const dbService = require("./db/DBService");
const path = require("path");

const azureOpenAIService = new AzureOpenAIService();
const eToroService = new EtoroService();
const xAIService = new XAIService();

const AIType = {
  AzureOpenAI: "AzureOpenAI",
  XAI: "XAI",
};

const Platform = {
  X: "X",
  eToro: "eToro",
};

const USE_AI = AIType.XAI;
const PORT = process.env.PORT || 4000;

const app = express();
app.use(express.json());
let domainForCors = process.env.CALLBACK_DOMAIN;
if (domainForCors.length > 1 && domainForCors.slice(-1) === "/") {
  domainForCors = domainForCors.slice(0, -1);
}

app.use(cors({ origin: domainForCors, credentials: true }));

app.use(cookieParser());
app.use( // TODO check without it
  session({
    secret: process.env.X_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true in production for HTTPS
  })
);
app.use("/api", authRoutes);
app.use("", xAuthRoutes);

async function generatePostsByAI(content) {
  const prompt = `${content}. please return the tweets that you generate as a vaild JSON that is an array. Each elemnet in the array will containt the text of the tweet you generated, and please you can drop the 'here are bla bla that you write in the begeining' please remove the \`\`\`json in the begining and at the end
  before any stock symbol put $ and not #`;
  let result = [];
  let response;

  try {
    switch (USE_AI) {
      case AIType.XAI:
        response = await xAIService.generatePosts(prompt);
        break;
      case AIType.AzureOpenAI:
        response = await azureOpenAIService.generatePosts(prompt);
        break;
      default:
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
  return result;
}

app.get("/api/getPostsFromEtoro", async (req, res) => {
  const userName = req.query.username;
  try {
    const eToroFeed = await eToroService.getEtoroFeedByUsername(userName);
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
  const loginDetails = {
    xCsrfToken: req.headers.xcsrftoken,
    token: req.headers.token,
    userName,
  };
  try {
    const content = req.body.content;
    const result = await eToroService.postOnEtoroFeedByLoginDetails(
      loginDetails,
      content
    );
    // if (result?.statusText === "Created") {
    //   dbService.insert({
    //     username: userName,
    //     platform: Platform.eToro,
    //     content: result?.data?.data?.message?.text,
    //     postId: result?.data?.data?.id,
    //     // attachments
    //   });
    // }
    res.json({ result: result?.data?.data });
  } catch (e) {
    res.json({ e });
    console.error("Failed to post on eToro ", JSON.stringify(e));
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
  res.json({ result });
});

async function getSuggestedPostsPrompt(userName) {
  try {
    const portfolioData = await eToroService.fetchPortfolioData(userName);
    const positionsText = portfolioData?.positions.map((pos) => {
      const symbol = instruments.find(
        (element) => element.instrumentId === pos.instrumentId
      );
      return `${symbol?.ticker}: ${pos.valuePctUnrealized}`;
    });

    const positionsPrompt =
      positionsText !== undefined
        ? `This is my portfolio percent allocation per asset: ${positionsText.join(
            ", "
          )}`
        : "";
    const prompt = `Create 5 engaging and concise tweets for traders or investors audience about the latest assets.
Use an enthusiastic and professional tone, include 1-2 cashtags per post, and aim to spark conversations Make the text eye-catching.
The tweet should contain current asset prices and references to: news, articles, financial reports from the last 24 hours.
Don't return any prices. Try to generate at least one poll about market changes. add @eToro in the end of each post.
${positionsPrompt}`;

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
  res.json({ result });
});

app.post("/api/postOnX", async (req, res) => {
  const content = req?.body?.content;
  if (content === undefined || content === "" || content === null) {
    return res.json({ result: "Invalid content" });
  }
  try {
    const accessToken = req?.cookies?.xAccessToken;
    const loggedClient = new TwitterApi(accessToken);
    const { data: user } = await loggedClient?.v2?.me();
    let response;
    if (content?.includes("Poll Time!")) {
      const contentSplit = content?.split(`\r\n   - `);
      const text = contentSplit[0];
      const options = contentSplit?.slice(1, contentSplit.length);

      response = await loggedClient.v2
        .tweet(text, {
          poll: {
            duration_minutes: 1440, // Poll duration in minutes (maximum is 1440 minutes / 24 hours)
            options,
          },
        })
        .then((response) => {
          res.send(`Tweeted: ${response.data.text}`);
          return response;
        })
        .catch((err) => {
          res.status(500).send(`Error: ${err.message}`);
          return "failed";
        });
    } else {
      response = await loggedClient.v2
        .tweet(content)
        .then((response) => {
          console.log(`${user.username} tweeted: ${content}`);
          return response;
        })
        .catch((err) => {
          console.log(`Tweet failed: ${err?.data?.title}`);
          return `Tweet failed: ${err?.data?.title}`;
        });
    }
    // if (response !== "failed") {
    //   dbService.insert({
    //     username: user.username,
    //     platform: Platform.X,
    //     content: response?.data?.text,
    //     postId: response?.data?.id,
    //     // attachments
    //   });
    // }
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

app.get("/api/logout", (req, res) => {
  
  // Clear the cookie by name (xAccessToken)
  // res.clearCookie('xAccessToken', { path: '/' });  // Make sure the path matches the original path used for the cookie
  res.json({ message: 'Logged out success' });
});

app.post("/api/generateImage", async (req, res) => {
  const prompt = req?.body?.prompt;
  try {
    const imageUrl = await azureOpenAIService.generateImage(prompt);
    console.log("Generated Image URL:", imageUrl);
    res.json({ result: imageUrl });
  } catch (error) {
    console.error("Error during image creation:", error);
    res.json({ error });
  }
});

app.post("/api/insertToDB", async (req, res) => {
  try {
    const { username, platform, content, postId } = req?.body;
    const result = await dbService.insert({ username, platform, content, postId });
    res.json({ result });
  } catch (e) {
    res.json({ e });
  }
});

app.post("/api/deleteFromDB", async (req, res) => {
  try {
    const result = await dbService.delete({
      username: req?.body?.username,
    });
    res.json({ result });
  } catch (e) {
    res.json({ e });
  }
});

app.get("/api/getFromDB", async (req, res) => {
  try {
    const result = await dbService.get(req.query);
    res.json({ result });
  } catch (e) {
    res.json({ e });
  }
});

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, "../etoro-boost/build")));

// Handle React routing, return all requests to React app
app.get("*", (req, res) => {
  // This needs to be AFTER your API routes
  res.sendFile(path.join(__dirname, "../etoro-boost/build", "index.html"));
});

app.listen(PORT, '0.0.0.0', async () => {
  instruments = await eToroService.getInstruments();
  console.log(`Server is running on http://localhost:${PORT}`);
});
