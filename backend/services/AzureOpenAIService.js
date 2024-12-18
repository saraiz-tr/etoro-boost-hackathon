// services/AzureOpenAIService.js
const axios = require("axios");
const { AzureOpenAI } = require("openai");

class AzureOpenAIService {
  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_URL;
    this.apiKey = process.env.AZURE_OPENAI_API_KEY;
    this.deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID;
    this.apiVersion = "2024-02-15-preview";

    (this.imageEndpoint = process.env.AZURE_OPENAI_IMAGE_URL),
      (this.imageApiKey = process.env.AZURE_OPENAI_IMAGE_API_KEY),
      (this.imageApiVersion = process.env.AZURE_OPENAI_IMAGE_VERSION),
      (this.imageDeployment = process.env.AZURE_OPENAI_IMAGE_DEPLOYMENT_ID);
  }

  async generateImage(prompt) {
    try {
      const openaiClient = new AzureOpenAI({
        endpoint: this.imageEndpoint,
        apiKey: this.imageApiKey,
        apiVersion: this.imageApiVersion,
        deployment: this.imageDeployment,
      });
      const results = await openaiClient.images.generate({
        prompt,
        size: "1024x1024",
        n: 1, //numberOfImagesToGenerate
        model: "",
        style: "vivid", // or "natural"
      });
      return results?.data[0].url;
    } catch (error) {
      console.error(
        "Azure OpenAI error:",
        error.response?.data || error.message
      );
      throw new Error("Failed to get a response from Azure OpenAI");
    }
  }

  async generatePosts(prompt) {
    try {
      const response = await axios.post(
        `${this.endpoint}/openai/deployments/${this.deploymentId}/completions?api-version=${this.apiVersion}`,
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
          max_tokens: 800, // Adjust token limit
          temperature: 0.7, // Adjust creativity level
          top_p: 0.95,
          stream: false,
        },
        {
          headers: {
            "Content-Type": "application/json",
            "api-key": this.apiKey,
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

module.exports = AzureOpenAIService;
