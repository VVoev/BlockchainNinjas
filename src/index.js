require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const debug = require('debug')('slash-command-template:index');
const {transferEther, getBalance} = require('./account-transactions');

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
    ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

/*
 * Endpoint to receive /helpdesk slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/', async (req, res) => {
  // extract the verification token, slash command text,
  // and trigger ID from payload
  const { token, text, trigger_id } = req.body;
  console.log(token, text);
  const senderId = req.body.user_id;
  let users;

  // check that the verification token matches expected value
  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    //get users list
    var url = 'https://slack.com/api/users.list?token=' + process.env.SLACK_ACCESS_TOKEN + '&pretty=1';
    
    var readUsers = await axios.get(url).then( res => {
      console.log(res.data.members);
      users = res.data.members.filter(user => user.profile.email && user.id != senderId).map(user => {
        return {
            label: user.real_name,
            value: user.name
          }
      });
  }); 

    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: 'Send eth',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [
          {
            label: 'Amount',
            type: 'text',
            name: 'amount',
            value: text,
            hint: 'Amount of eth',
          },
          {
            label: 'Reason',
            type: 'textarea',
            name: 'reason',
            optional: true,
          },
          {
            label: 'recepient',
            type: 'select',
            name: 'recepient',
            options: users,
          },
        ],
      }),
    };
    // open the dialog by calling dialogs.open method and sending the payload
    axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
      .then((result) => {
        debug('dialog.open: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('dialog.open call failed: %o', err);
        res.sendStatus(500);
        console.log('error');
      });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(500);
  }
});

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a Helpdesk ticket
 */
app.post('/interactive-component', async (req, res) => {
  const body = JSON.parse(req.body.payload);

  // check that the verification token matches expected value
  if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
    debug(`Form submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');   

    // create Helpdesk ticket
    const payload = JSON.parse(req.body.payload);
    const amount = payload.submission.amount;
    const recepient = payload.submission.recepient;
    const sender = payload.user.name;

    await transferEther(recepient, sender, amount);
    return res.status(200).end({ok: true, message: 'ethers transfered successfully!'});

  } else {
    debug('Token mismatch');
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
