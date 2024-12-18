const express = require('express');
const router = express.Router();
const { TwitterApi } = require('twitter-api-v2');
const moment = require("moment");

const twitterClient = new TwitterApi({
    clientId: process.env.X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET
  });

const CALLBACK_URL = process.env.CALLBACK_URL;

// Authentication endpoint
router.get('/auth/twitter', async (req, res) => {
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
router.get("/auth/twitter/callback", async (req, res) => {
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

        // mapUserToToken[user.username] = {
        // name: user.name,
        // token: accessToken,
        // tokenSecret: refreshToken,
        // loggedClient,
        // expirationTime
        // }
        console.log("Authentication successful", { userId: user.username }); 
        
        res.redirect(`${process.env.CALLBACK_DOMAIN}dashboard`);
    } catch (error) {
        console.log("Authentication error", { error: error.message }, true);
        // res.redirect("/?error=" + encodeURIComponent("Authentication failed")); TODO
    }
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

router.get("/auth/user", (req, res) => {
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

    res.json({ loggedIn: true });
    // if (mapUserToToken[key]) {
    //     res.json({ loggedIn: true });
    // } else {
    //     res.status(401).json({ error: "Unauthorized" });
    // }
});

module.exports = router;