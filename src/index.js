require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const debug = require('debug')('slash-command-template:index');
const { transferEther, getBalance, toEther, getTransactionAddress, getWallet } = require('./account-transactions');
const { IncomingWebhook, WebClient } = require('@slack/client');
const { getUsers } = require('./users');
const app = express();
 
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/', async (req, res) => {

    const { token, text, trigger_id } = req.body;
    const senderId = req.body.user_id;

    if (token === process.env.SLACK_VERIFICATION_TOKEN) {
        var url = 'https://slack.com/api/users.list?token=' + process.env.SLACK_ACCESS_TOKEN + '&pretty=1';

        const users = await getUsers(senderId, url);

        const dialog = {
            token: process.env.SLACK_ACCESS_TOKEN,
            trigger_id,
            dialog: JSON.stringify({
                title: 'Send eth',
                callback_id: 'submit-ticket',
                submit_label: 'Submit',
                elements: [{
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

        axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
            .then((result) => {
                debug('dialog.open: %o', result.data);
                console.log(result.data, 'data data');
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

app.post('/balance', async(req, res) => {
    const { user_name } = req.body;

    if (!user_name) {
        return res.status(400).send({ ok: false, message: 'No payload' });
    }

    const balance = await getBalance(user_name);
    const ethBalance = toEther(balance.toString());
    return res.status(200).send(`Your balance: ${Number(ethBalance).toFixed(2)} ETH`);
});

app.post('/wallet', async(req, res) => {
    const { user_name } = req.body;

    if (!user_name) {
        return res.status(400).send({ ok: false, message: 'No payload' });
    }

    const walletAddress = await getWallet(user_name);
    return res.status(200).send(`Your wallet address is: ${walletAddress}`);
});

app.post('/interactive-component', async(req, res) => {
    const body = JSON.parse(req.body.payload);
    const { token, text, trigger_id } = req.body;

    if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
        debug(`Form submission received: ${body.submission.trigger_id}`);
        res.send('');

        const payload = JSON.parse(req.body.payload);
        const amount = payload.submission.amount;
        const recepient = payload.submission.recepient;
        const sender = payload.user.name;

        const transactionUrl = getTransactionAddress(sender);
        sendSuccessNotification({
          "title": "EtherScan link",
          "title_link": transactionUrl,
          "text": `transaction started.`,
          "color": "#7CD197"
      });

        await transferEther(sender, recepient, amount);
        setTimeout(() => sendSuccessNotification({
          "image_url": "https://media.tenor.com/images/02ca5bd36fe406a776a1e007d009ef78/tenor.gif",
          "text": `${sender} send ${amount} ether to ${recepient}.`,
          "color": "#7CD197"
      }), 55000);

        return res.status(200).end({ ok: true, message: 'ethers transfered successfully!' });
    } else {
        debug('Token mismatch');
        res.sendStatus(500);
    }
});

app.listen(process.env.PORT, () => {
    console.log(`App listening on port ${process.env.PORT}!`);
})

const sendSuccessNotification = (attachment) => {
  const timeNotification = new IncomingWebhook('https://hooks.slack.com/services/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');
timeNotification.send(
  {"attachments": [
    attachment
]},
  (error, resp) => {
    if (error) {
      return console.error(error);
    }
    console.log('Notification sent');
  });
}
