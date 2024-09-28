const express = require('express');
const axios = require('axios'); // For making the external API request
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

// Serve static files (like index.html) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// GET route for /exchange-get
app.get('/exchange-get', async (req, res) => {
  try {
    // Get the access token from the request headers
    const accessToken = req.headers.authorization;

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Proper auth not found. Please enter Bearer token in headers.' });
    }

    const token = accessToken.split(' ')[1]; // Extract Bearer token

    // Make the GET request to the external service for exchange token
    const url = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange';
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const response = await axios.get(url, { headers });

    if (response.status === 200) {
      const exchangeInfo = response.data;

      const expiresIn = exchangeInfo.expiresInSeconds || 'N/A';
      const exchangeCode = exchangeInfo.code || 'N/A';
      const clientId = exchangeInfo.creatingClientId || 'N/A';
      const loginUrl = `https://www.epicgames.com/id/exchange?exchangeCode=${exchangeCode}`;

      // Return the exchange code and other details
      return res.json({
        message: 'Exchange code generated successfully!',
        exchange_code: exchangeCode,
        expires_in: `${expiresIn} seconds`,
        client_id: clientId,
        login_url: loginUrl,
      });
    } else if (response.status === 401) {
      return res.status(401).json({ error: 'Invalid or expired access token.' });
    } else {
      return res.status(response.status).json({
        error: `Failed to generate exchange token. Status code: ${response.status}`,
        response: response.data,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// GET route for /device-auth-get
app.get('/device-auth-get', async (req, res) => {
  try {
    // Get the access token from the request headers
    const accessToken = req.headers.authorization;
    const accountId = req.headers['account-id']; // Get the account ID from the headers

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Proper auth not found. Please enter Bearer token in headers.' });
    }

    const token = accessToken.split(' ')[1]; // Extract Bearer token

    if (!accountId) {
      return res.status(400).json({ error: 'Proper auth not found. Please enter account ID in headers.' });
    }

    // Construct the URL for device authentication
    const url = `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${accountId}/deviceAuth`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(url, {}, { headers });

    if (response.status === 200) {
      const deviceInfo = response.data;

      // Extract relevant information
      const deviceId = deviceInfo.deviceId || 'Not Found';
      const accountId = deviceInfo.accountId || 'Not Found';
      const secret = deviceInfo.secret || 'Not Found';
      const expiresIn = deviceInfo.expiresInSeconds || 'Not Available';

      // Return the device auth info
      return res.json({
        message: 'Device authentication info retrieved successfully!',
        device_id: deviceId,
        account_id: accountId,
        secret: secret,
        expires_in: `${expiresIn} seconds`,
      });
    } else {
      return res.status(response.status).json({
        error: `Failed to fetch device auth info. Status code: ${response.status}`,
        response: response.data,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
