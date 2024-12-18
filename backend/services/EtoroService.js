const axios = require("axios");
const { v4: uuidv4 } = require("uuid"); // For generating unique client request IDs
const moment = require("moment");

class EtoroService {
  constructor() {
    this.etoroApiUrl = process.env.ETORO_API_URL;
    this.etoroApiKey = process.env.ETORO_API_KEY;
    this.etoroApiGateway = process.env.ETORO_API_GATEWAY;
  }

  // Fetches the portfolio summary for a given username
  async fetchPortfolioData(userName) {
    try {
      const response = await axios.get(
        `${this.etoroApiUrl}API/User/V1/${userName}/PortfolioSummary`,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": this.etoroApiKey,
          },
        }
      );
      return response.data;
    } catch (e) {
      console.error(
        `Failed to fetch portfolio data for ${userName}: `,
        e.message
      );
      return null;
    }
  }

  // Retrieves the GCID (Global Client ID) for a given username
  async getGCID(username) {
    try {
      const response = await axios.get(
        `https://helpers.bullsheet.me/api/gcid?username=${username}`
      );
      return response?.data?.gcid;
    } catch (error) {
      console.error("Error fetching GCID: ", error);
      return null;
    }
  }

  // Fetches the feed of posts from eToro using the GCID
  async getEtoroFeedByUsername(userName) {
    try {
      const clientRequestId = uuidv4();
      const gcid = await this.getGCID(userName);
      const url = `${this.etoroApiGateway}feed/user/all/${gcid}?take=10&offset=0&reactionsPageSize=10&client_request_id=${clientRequestId}`;

      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error("Error fetching eToro feed: ", error);
      return null;
    }
  }

  // Posts content to eToro feed
  async postOnEtoroFeedByLoginDetails(loginDetails, content) {
    try {
      const gcid = await this.getGCID(loginDetails.userName);
      let body = this.generatePostBody(content, gcid);
      const url = `${this.etoroApiUrl}api/feeds/v1/feed?path=discussion&subscription-key=${this.etoroApiKey}`;
      const result = await axios.post(url, body, {
        headers: {
          "Ocp-Apim-Subscription-Key": this.etoroApiKey,
          "x-token": loginDetails.token,
          "x-csrf-token": loginDetails.xCsrfToken,
        },
      });
      return result;
    } catch (error) {
      console.error("Error posting on eToro feed: ", error);
      return "failed";
    }
  }

  // Fetches eToro feed data by user name
  async getPostsFromEtoro(userName) {
    try {
      const gcid = await this.getGCID(userName);
      if (!gcid) throw new Error("Invalid GCID");

      const eToroFeed = await this.getEtoroFeedByGCID(gcid);
      const posts = eToroFeed?.discussions
        ?.map((item) => item?.post?.message?.text)
        .filter((text) => text);

      return posts || [];
    } catch (e) {
      console.error(
        `Failed to get posts from eToro for ${userName}: `,
        e.message
      );
      return [];
    }
  }

  async getInstruments() {
    try {
      const instrumentsResponse = await axios.get(
        `${this.etoroApiUrl}Metadata/V1/Instruments`,
        { headers: { "Ocp-Apim-Subscription-Key": this.etoroApiKey } }
      );
      if (instrumentsResponse.status === 200) {
        return instrumentsResponse.data;
      }
      return [];
    } catch (e) {
      console.error(`Failed to get instruments from eToro: `, e.message);
      return [];
    }
  }

  // Generates the post body (with or without images) based on the content
  generatePostBody(content, gcid) {
    let body = {};
    if (content?.includes("Poll Time!")) {
      const contentSplit = content.split(`\r\n   - `);
      const text = contentSplit[0];
      const options = contentSplit.slice(1);

      body = {
        owner: gcid,
        message: content,
        poll: {
          title: content,
          options,
        },
      };
    } else {
      const image = content?.image;
      const attachments = image
        ? [
            {
              url: image,
              host: "https://openbook-static-files-prod.s3.amazonaws.com",
              mediaType: "image",
              media: {
                image: {
                  width: 1530,
                  height: 802,
                  url: image,
                },
              },
            },
          ]
        : [];

      body = {
        owner: gcid,
        message: content,
        attachments,
      };
    }
    return body;
  }
}

module.exports = EtoroService;
