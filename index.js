const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

// Serve static files (like index.html) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// GET route for /exchange-get
app.get('/exchange-get', async (req, res) => {
  try {
    const accessToken = req.headers.authorization;

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Proper auth not found. Please enter Bearer token in headers.' });
    }

    const token = accessToken.split(' ')[1];

    const url = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange';
    const headers = { Authorization: `Bearer ${token}` };

    const response = await axios.get(url, { headers });

    if (response.status === 200) {
      const exchangeInfo = response.data;

      const expiresIn = exchangeInfo.expiresInSeconds || 'N/A';
      const exchangeCode = exchangeInfo.code || 'N/A';
      const clientId = exchangeInfo.creatingClientId || 'N/A';
      const loginUrl = `https://www.epicgames.com/id/exchange?exchangeCode=${exchangeCode}`;

      return res.json({
        message: 'processed',
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
    const accessToken = req.headers.authorization;
    const accountId = req.headers['account-id'];

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Proper auth not found. Please enter Bearer token in headers.' });
    }

    const token = accessToken.split(' ')[1];

    if (!accountId) {
      return res.status(400).json({ error: 'Proper auth not found. Please enter account ID in headers.' });
    }

    const url = `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${accountId}/deviceAuth`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(url, {}, { headers });

    if (response.status === 200) {
      const deviceInfo = response.data;

      const deviceId = deviceInfo.deviceId || 'Not Found';
      const accountId = deviceInfo.accountId || 'Not Found';
      const secret = deviceInfo.secret || 'Not Found';
      const expiresIn = deviceInfo.expiresInSeconds || 'Not Available';

      return res.json({
        message: 'processed',
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

// GET route for /user-lookup
app.get('/user-lookup', async (req, res) => {
  try {
    const accessToken = req.headers.authorization;
    const displayName = req.headers['display-name'];

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Proper auth not found. Please enter Bearer token in headers.' });
    }

    const token = accessToken.split(' ')[1];

    if (!displayName) {
      return res.status(400).json({ error: 'Display name not provided in headers.' });
    }

    const url = `https://account-public-service-prod.ol.epicgames.com/account/api/public/account/displayName/${displayName}`;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const response = await axios.get(url, { headers });

    if (response.status === 200) {
      const accountInfo = response.data;

      return res.json({
        message: 'processed',
        account_id: accountInfo.id || 'N/A',
        display_name: accountInfo.displayName || 'N/A',
      });
    } else {
      return res.status(response.status).json({
        error: `Failed to lookup user. Status code: ${response.status}`,
        response: response.data,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// Self-ping to prevent server spin-down
setInterval(() => {
  axios.get('https://fnp-ka4a.onrender.com')
    .then(response => {
      console.log('processed', response.status);
    })
    .catch(error => {
      console.error('Error in self-ping:', error.message);
    });
}, 5 * 60 * 1000); // Ping every 5 minutes

// Start the server
app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
