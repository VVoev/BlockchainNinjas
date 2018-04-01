const slackAccounts = {
    ludzhev: {
        address: '0xA46e09B7EF54D0c35faBcF9FC3bC9657C8a6c263',
        privateKey: 'c53886c7865ea31c3bbca97e15736ae080576ce67942cafd930e7e05ec5da676'
    },
    vladovoev: {
        address: '0xb2fa15Ea925009B2025D022C67D9C340C112D2D4',
        privateKey: '104daefd0346dcfa85dea0a5e1cc59730eeed161f217f3e10a36e25bcf8a32e8'
    },
    borislavborisov199: {
        privateKey: '1fe6d881a03085002faace5b2fae4da9f655c4ab4d4ec8a234cc7e51a4474672',
        address: '0x2b76E9c3B10727264ABDdd83ecD0eA99556dA2ff'
    },
    petkoche90: {
        address: '0xd98cdff2A03a135Ab1cABC4e7050235DB124B6bE',
        privateKey: 'c1424038bc63a37b1a51e3be6172c24e69bbccd6f10b30224b64c0941f2677aa'
    },
};

const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider('https://rinkeby.infura.io/aXIKI0nfzITdIwfs1wie'));


const userIsRegistered = (username) => {
    return !!slackAccounts[username];
};

const registerUser = (username) => {
    slackAccounts[username] = web3.eth.accounts.create();
    console.log(slackAccounts[username], 'newAccount');
    return slackAccounts[username];
};

const getWallet = (username) => {
    return slackAccounts[username].address;
};

const getTransactionAddress = (username) => {
    const walletAddress = getWallet(username);
    const urlTransaction = "https://rinkeby.etherscan.io/address/" + walletAddress;
    return urlTransaction;
}

const toEther = (weiAmount) => {
    return web3.utils.fromWei(weiAmount, 'ether');
}

const transferEther = async(fromUsername, toUsername, amount) => {
    const from = slackAccounts[fromUsername] ?
        slackAccounts[fromUsername] : registerUser(fromUsername);

    const to = slackAccounts[toUsername] ?
        slackAccounts[toUsername] : registerUser(toUsername);

    const fromBalance = await web3.eth.getBalance(from.address);

    const toBalance = await web3.eth.getBalance(to.address);
    console.log(web3.utils.fromWei(fromBalance, 'ether'), 'fromBalance');
    console.log(web3.utils.fromWei(toBalance, 'ether'), 'toBalance');
    return send(from, to, amount);
};

const getBalance = async(username) => {
    return web3.eth.getBalance(slackAccounts[username].address);
};

function send(from, to, amount) {
    return new Promise((resolve, reject) => {

        const Tx = require('ethereumjs-tx')
            // the address that will send the test transaction
        const addressFrom = from.address;
        const {
            privateKey
        } = from;

        // the destination address
        const addressTo = to.address;

        // Signs the given transaction data and sends it. Abstracts some of the details 
        // of buffering and serializing the transaction for web3.
        function sendSigned(txData, cb) {
            const privKey = new Buffer(privateKey, 'hex')
            const transaction = new Tx(txData)
            transaction.sign(privKey);

            const serializedTx = transaction.serialize().toString('hex');
            return web3.eth.sendSignedTransaction('0x' + serializedTx, cb)
        }

        // get the number of transactions sent so far so we can create a fresh nonce
        web3.eth.getTransactionCount(addressFrom).then(txCount => {
            // construct the transaction data
        const weis = (amount * 1000000000000000000).toString();

            const txData = {
                nonce: web3.utils.toHex(txCount).toString(),
                gasLimit: web3.utils.toHex(25000).toString(),
                gasPrice: web3.utils.toHex(10e10).toString(), // 10 Gwei
                to: addressTo,
                from: addressFrom,
                value: web3.utils.toHex(weis)
            }

            // fire away!
            sendSigned(txData, function(err, result) {
                if (err) {
                    console.log('error', err);
                    reject('Transaction failed!');
                }

                console.log('sent', result)
                resolve();
            });
        });
    });
}

module.exports = {
    transferEther,
    getBalance,
    getTransactionAddress,
    getWallet,
    toEther
};
