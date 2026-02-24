// gmailOtpReader.js
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

let gmailClient;

/* =========================================================
INITIALIZE GMAIL API
========================================================= */
async function initializeGmailAPI() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`credentials.json not found at ${CREDENTIALS_PATH}`);
    }

    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error(`token.json not found at ${TOKEN_PATH}`);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_id, client_secret, redirect_uris } =
        credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oAuth2Client.setCredentials(token);

    gmailClient = google.gmail({
        version: 'v1',
        auth: oAuth2Client,
    });

    console.log('Gmail API initialized successfully');
}

/* =========================================================
FETCH OTP FROM GMAIL
========================================================= */
async function getOtpFromGmail({
    maxRetries = 10,
    retryDelay = 3000,
    maxAgeMinutes = 5,
} = {}) {
    if (!gmailClient) {
        throw new Error('Gmail API not initialized. Call initializeGmailAPI() first.');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Attempt ${attempt}/${maxRetries}`);

        // 🔎 Only search recent unread OTP emails
        const response = await gmailClient.users.messages.list({
            userId: 'me',
            q: `is:unread newer_than:${maxAgeMinutes}m`,
            maxResults: 5,
        });

        const messages = response?.data?.messages;
        if (!messages || messages.length === 0) {
            console.log('No OTP email found yet...');
            await delay(retryDelay);
            
            continue;
        }

        for (const msg of messages) {
            const message = await gmailClient.users.messages.get({
                userId: 'me',
                id: msg.id,
            });

            const headers = message.data.payload.headers;
            const subjectHeader = headers.find(h => h.name === 'Subject');
            const subject = subjectHeader ? subjectHeader.value : '';

            console.log(`[INFO] Checking email: ${subject}`);

            // Extract exactly 6-digit OTP from subject
            const otpMatch = subject.match(/\b\d{6}\b/);

            if (otpMatch) {
                const otp = otpMatch[0];

                console.log(`OTP FOUND: ${otp}`);

                // Mark email as read (very important for stability)
                await gmailClient.users.messages.modify({
                    userId: 'me',
                    id: msg.id,
                    requestBody: {
                        removeLabelIds: ['UNREAD'],
                    },
                });

                return otp;
            }
        }

        await delay(retryDelay);
    }

    throw new Error('OTP not received within time limit');
}

/* =========================================================
HELPER FUNCTION
========================================================= */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    initializeGmailAPI,
    getOtpFromGmail,
};