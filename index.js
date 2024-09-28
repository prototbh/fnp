const express = require('express');
const axios = require('axios'); // For making the external API request
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

// Serve static files (like index.html) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// POST route for /exchange
app.post('/exchange', async (req, res) => {
  try {
    // Get the access token from the request headers
    const accessToken = req.headers.authorization;

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header missing or improperly formatted.' });
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
      return res.status(401).json({ error: 'Invalid or expired access token. Please log in again.' });
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

// Start the server
app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
