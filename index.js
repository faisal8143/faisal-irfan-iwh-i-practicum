require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const objectUrl = 'https://api.hubapi.com/crm/v3/objects/2-271405404';

if (!token) {
  throw new Error('Set HUBSPOT_PRIVATE_APP_TOKEN in your local .env file.');
}

const hubspot = axios.create({
  headers: { Authorization: `Bearer ${token}` },
  timeout: 15000
});

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Homepage: read Campaign Briefs and display them in a table.
app.get('/', async (req, res) => {
  try {
    const records = [];
    let after;

    do {
      const response = await hubspot.get(objectUrl, {
        params: {
          properties: 'name,channel,objective',
          limit: 100,
          after
        }
      });

      for (const result of response.data.results) {
        records.push(result.properties);
      }

      after = response.data.paging?.next?.after;
    } while (after != null);

    return res.render('homepage', {
      title: 'Campaign Briefs',
      records
    });
  } catch (error) {
    console.error('Could not load briefs:', error.response?.status || 'connection error');
    return res.status(502).send('Could not load Campaign Briefs from HubSpot.');
  }
});

// Form: show the page for adding a Campaign Brief.
app.get('/update-cobj', (req, res) => {
  return res.render('updates', {
    title: 'Update Custom Object Form | Integrating With HubSpot I Practicum'
  });
});

// Form submission: create a record, then return to the homepage.
app.post('/update-cobj', async (req, res) => {
  const { name, channel, objective } = req.body || {};
  const fields = [name, channel, objective];

  if (!fields.every(value => typeof value === 'string' && value.trim() !== '')) {
    return res.status(400).send('Please enter a name, channel, and objective.');
  }

  const record = {
    properties: {
      name: name.trim(),
      channel: channel.trim(),
      objective: objective.trim()
    }
  };

  try {
    await hubspot.post(objectUrl, record);
    return res.redirect(303, '/');
  } catch (error) {
    console.error('Could not create brief:', error.response?.status || 'connection error');
    return res.status(502).send(
      'Could not confirm the save. Check the HubSpot list before trying again.'
    );
  }
});

app.listen(3000, '127.0.0.1', () => {
  console.log('Open http://127.0.0.1:3000');
});
