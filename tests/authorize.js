// authorize.js
/**
 * Run this script once (or whenever you need to re‑authorise) to generate
 * token.json for the Gmail helper.
 *
 * It will:
 *   1️⃣ Load credentials.json (client_id / client_secret)
 *   2️⃣ Open a URL that you must visit in a browser.
 *   3️⃣ Paste the returned code back into the terminal.
 *   4️⃣ Store the resulting access & refresh tokens in token.json.
 *
 * NOTE: Keep credentials.json & token.json out of source control!
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
];
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function authorize() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('⚠️  credentials.json not found. Create one from the Google Cloud console.');
        return;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // If we already have a token, try to use it first – it may still be valid.
    if (fs.existsSync(TOKEN_PATH)) {
        const savedTokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
        oAuth2Client.setCredentials(savedTokens);
        // Quick test – see if the access token works.
        try {
            await oAuth2Client.getAccessToken(); // will refresh automatically if needed
            console.log('✅ Existing token is still valid – no need to re‑authorise.');
            return;
        } catch (e) {
            console.warn('⚠️  Existing token is invalid or expired – re‑authorising...');
        }
    }

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // gets a refresh token
        prompt: 'consent',
        scope: SCOPES,
    });

    console.log('\n=== Google OAuth2 Authorization ===\n');
    console.log('1️⃣  Open the following URL in a browser:');
    console.log(authUrl);
    console.log('\n2️⃣  Grant access and copy the *authorization code* that Google returns.\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const code = await new Promise((resolve) => rl.question('Paste the code here: ', resolve));
    rl.close();

    try {
        const { tokens } = await oAuth2Client.getToken(code.trim());
        // Persist the token for later runs
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log(`✅ Token saved to ${TOKEN_PATH}`);
    } catch (err) {
        console.error('❌ Failed to retrieve token:', err.message);
    }
}

authorize();