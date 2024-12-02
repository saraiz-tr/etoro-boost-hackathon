const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/login/etoro', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data'
      });
    }

    const response = await axios.post(
      'https://api.etoro.com/API/Trading/V1/Account/Login',
      { username, password },
      {
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': 'e346b9724ae940b1893d55ea8f30527f'//process.env.ETORO_SUBSCRIPTION_KEY
        }
      }
    );

    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;