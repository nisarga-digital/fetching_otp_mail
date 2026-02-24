const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

/* ================================
CONFIGURATION
================================ */
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify'
];

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

/* ================================
AUTHORIZATION
================================ */
async function authorize() {

    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('credentials.json not found');
        return;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const keys = credentials.installed || credentials.web;

    const { client_id, client_secret, redirect_uris } = keys;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',   // REQUIRED
        prompt: 'consent',        // REQUIRED (forces refresh_token)
        scope: SCOPES
    });

    console.log('\nOpen this URL in your browser:\n');
    console.log(authUrl);
    console.log('\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Paste the authorization code here: ', async (code) => {
        rl.close();

        try {
            const { tokens } = await oAuth2Client.getToken(code);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

            console.log('\nAuthorization successful');
            console.log('token.json saved at:', TOKEN_PATH);
        } catch (error) {
            console.error('\nError getting token:', error.message);
        }
    });
}

authorize();
