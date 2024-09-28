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
    const accessToken = req.headers.authorization;

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header missing or improperly formatted.' });
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

// GET route for /device-auth-get
app.get('/device-auth-get', async (req, res) => {
  try {
    const accessToken = req.headers.authorization;
    const accountId = req.headers['account-id'];

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header missing or improperly formatted.' });
    }

    const token = accessToken.split(' ')[1]; // Extract Bearer token

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required in the headers.' });
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
      const loginUrl = `https://www.epicgames.com/id/deviceAuth?deviceId=${deviceId}`;

      return res.json({
        message: 'Device authentication info retrieved successfully!',
        device_id: deviceId,
        account_id: accountId,
        secret: secret,
        expires_in: `${expiresIn} seconds`,
        login_url: loginUrl,
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

// GET route for /ghosty-skin
app.get('/ghosty-skin', async (req, res) => {
  try {
    const accessToken = req.headers.authorization;
    const accountId = req.headers['account-id'];
    const skinName = req.query.skin_name;

    if (!accessToken || !accessToken.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'Authorization header missing or improperly formatted.' });
    }

    const token = accessToken.split(' ')[1]; // Extract Bearer token

    if (!accountId) {
      return res.status(400).json({ error: 'Account ID is required in the headers.' });
    }

    if (!skinName) {
      return res.status(400).json({ error: 'Skin name is required as a query parameter.' });
    }

    // Determine skin_id
    let skinId = skinName;
    
    // Check if skinName starts with 'CID', 'character_' or 'bean_'
    if (!(skinName.startsWith('character_') || skinName.startsWith('cid_') || skinName.startsWith('bean_'))) {
      // Fetch the skin ID from Fortnite API
      const response = await axios.get(`https://fortnite-api.com/v2/cosmetics/br/search?name=${skinName}`);
      const skinData = response.data.data;
      if (skinData) {
        skinId = skinData.id;
      }
    }

    // Get party information
    const partyUrl = `https://party-service-prod.ol.epicgames.com/party/api/v1/Fortnite/user/${accountId}`;
    const partyResponse = await axios.get(partyUrl, { headers: { Authorization: `Bearer ${token}` } });

    if (partyResponse.status !== 200) {
      return res.status(403).json({ error: 'You must be online.' });
    }

    const partyData = partyResponse.data.current;
    if (!partyData || partyData.length === 0) {
      return res.status(403).json({ error: 'You must be online!' });
    }

    const partyId = partyData[0].id;
    const member = partyData[0].members.find(m => m.account_id === accountId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const currentRevision = member.revision;
    const updateObject = {
      "Default:AthenaCosmeticLoadout_j": JSON.stringify({
        "AthenaCosmeticLoadout": {
          "characterPrimaryAssetId": `AthenaCharacter:${skinId}`,
          "characterEKey": "",
          "backpackDef": "",
          "backpackEKey": "",
          "pickaxeDef": "",
          "pickaxeEKey": "",
          "contrailDef": "",
          "contrailEKey": "",
          "scratchpad": [],
          "cosmeticStats": [
            { "statName": "HabaneroProgression", "statValue": 16 },
            { "statName": "TotalVictoryCrowns", "statValue": 8 },
            { "statName": "TotalRoyalRoyales", "statValue": 1 },
            { "statName": "HasCrown", "statValue": 0 }
          ]
        }
      })
    };

    const patchUrl = `https://party-service-prod.ol.epicgames.com/party/api/v1/Fortnite/parties/${partyId}/members/${accountId}/meta`;
    const patchResponse = await axios.patch(patchUrl, {
      delete: [],
      revision: currentRevision,
      update: updateObject
    }, { headers: { Authorization: `Bearer ${token}` } });

    if (patchResponse.status === 204) {
      return res.json({ message: `Successfully equipped skin: ${skinName}.` });
    } else {
      return res.status(patchResponse.status).json({ error: `Failed to change skin. Status code: ${patchResponse.status}` });
    }
  } catch (error) {
    return res.status(500).json({ error: `An error occurred: ${error.message}` });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API running on port ${port}`);
});
