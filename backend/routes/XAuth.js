const express = require("express");
const router = express.Router();
const { TwitterApi } = require("twitter-api-v2");

const twitterClient = new TwitterApi({
  clientId: process.env.X_CLIENT_ID,
  clientSecret: process.env.X_CLIENT_SECRET,
});

const CALLBACK_URL = process.env.CALLBACK_URL;

// Authentication endpoint
router.get("/auth/twitter", async (req, res) => {
  const authLink = await twitterClient.generateOAuth2AuthLink(CALLBACK_URL, {
    scope: ["tweet.read", "tweet.write", "users.read"],
  });
  const { url, state, codeVerifier } = authLink;
  req.session.codeVerifier = codeVerifier;
  console.log("Initiating OAuth flow", { state, callbackUrl: CALLBACK_URL });
  res.redirect(url);
});

// Callback endpoint for OAuth
router.get("/auth/twitter/callback", async (req, res) => {
  const { code, error: oauthError } = req.query;
  if (oauthError) {
    console.log("OAuth error from Twitter", { error: oauthError });
  }

  try {
    const { client: loggedClient, accessToken, expiresIn } = await twitterClient.loginWithOAuth2({
      code,
      codeVerifier: req.session.codeVerifier,
      redirectUri: CALLBACK_URL,
    });
    console.log("OAuth2 login successful, fetching user details");
    const { data: user } = await loggedClient.v2.me();
    console.log("Authentication successful", { userId: user.username });
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ,
      maxAge: expiresIn * 1000,
      // domain: "localhost",
    };
    res.cookie("xAccessToken", accessToken, cookieOptions);
    res.redirect(`${process.env.CALLBACK_DOMAIN}login`);
  } catch (error) {
    console.log("Authentication error", { error: error.message }, true);
  }
});

router.get("/auth/user", (req, res) => {
  if (req?.cookies?.xAccessToken) {
    return res.json({ loggedIn: true });
  }
  return res.status(401).json({ error: "Unauthorized" });
});

module.exports = router;