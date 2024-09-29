const express = require('express');
const axios = require('axios'); // For making the external API request
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

// Serve static files (like index.html) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// get route for /exchange
app.get('/exchange', async (req, res) => {
  try {
    const accessToken = req.headers.authorization;

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'inproper auth please provide bearer token in headers.' });
    }

    const token = accessToken.split(' ')[1]; // Extract Bearer token

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

      return res.json({
        message: 'processed!',
        exchange_code: exchangeCode,
        expires_in: `${expiresIn} seconds`,
        client_id: clientId,
        login_url: loginUrl,
      });
    } else if (response.status === 401) {
      return res.status(401).json({ error: 'inproper auth please provide bearer token in headers.' });
    } else {
      return res.status(response.status).json({
        error: `Failed to generate exchange token. Status code: ${response.status}`,
        response: response.data,
      });
    }
  } catch (error) {
    console.error('Error in /exchange:', error); // Log detailed error
    return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// GET route for /device-auth-get
app.get('/device-auth-get', async (req, res) => {
  try {
    const accessToken = req.headers.authorization;
    const accountId = req.headers['account-id'];

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'inproper auth please provide bearer token in headers.' });
    }

    const token = accessToken.split(' ')[1]; // Extract Bearer token

    if (!accountId) {
      return res.status(400).json({ error: 'inproper auth please provide account id in headers.' });
    }

    const url = `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${accountId}/deviceAuth`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.get(url, {}, { headers });

    if (response.status === 200) {
      const deviceInfo = response.data;

      const deviceId = deviceInfo.deviceId || 'Not Found';
      const accountId = deviceInfo.accountId || 'Not Found';
      const secret = deviceInfo.secret || 'Not Found';
      const expiresIn = deviceInfo.expiresInSeconds || 'Not Available';

      return res.json({
        message: 'processed!',
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
    console.error('Error in /device-auth-get:', error); // Log detailed error
    return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});
// get route for /device-auth-to-token
app.get('/device-auth-to-token', async (req, res) => {
  try {
    // Extract necessary headers
    const accountId = req.headers['account-id'];
    const deviceId = req.headers['device-id'];
    const secret = req.headers['secret'];

    if (!accountId || !deviceId || !secret) {
      return res.status(400).json({ error: 'Account ID, Device ID, and Secret are required in the headers.' });
    }

    // Define the endpoint URL and headers
    const url = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic MzQ0NmNkNzI2OTRjNGE0NDg1ZDgxYjc3YWRiYjIxNDE6OTIwOWQ0YTVlMjVhNDU3ZmI5YjA3NDg5ZDMxM2I0MWE='
    };

    // Define the data payload
    const data = new URLSearchParams({
      'grant_type': 'device_auth',
      'account_id': accountId,
      'device_id': deviceId,
      'secret': secret
    });

    // Perform the get request to get the access token
    const response = await axios.get(url, data.toString(), { headers });

    if (response.status === 200) {
      const responseData = response.data;
      const accessToken = responseData.access_token;

      return res.json({
        message: 'processed!',
        access_token: accessToken,
      });
    } else {
      return res.status(response.status).json({
        error: `Failed to retrieve access token. Status code: ${response.status}`,
        response: response.data,
      });
    }
  } catch (error) {
    console.error('Error in /device-auth-to-token:', error); // Log detailed error
    return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
