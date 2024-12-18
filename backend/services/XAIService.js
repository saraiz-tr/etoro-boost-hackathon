const axios = require("axios");

class XAIService {
  constructor() {
    this.endpoint = process.env.XAI_URL;
    this.apiKey = process.env.XAI_API_KEY;
  }

  async generatePosts(prompt) {
    try {
      const response = await axios.post(
        this.endpoint,
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
            Authorization: "Bearer " + this.apiKey,
          },
        }
      );
      return response;
    } catch (error) {
      console.error(
        "Azure OpenAI error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get a response from Azure OpenAI");
    }
  }
}

module.exports = XAIService;
