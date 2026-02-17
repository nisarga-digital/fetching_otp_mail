/**
 * gmailOtpReader.js
 *
 * Reliable Gmail OTP reader for Playwright tests
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

/* -------------------------------------------------------------------------
 * CONFIG
 * ---------------------------------------------------------------------- */

const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
];

const CREDENTIALS_PATH =
    process.env.GMAIL_CREDENTIALS_PATH || path.join(__dirname, 'credentials.json');

const TOKEN_PATH =
    process.env.GMAIL_TOKEN_PATH || path.join(__dirname, 'token.json');

let gmailClient;

/* -------------------------------------------------------------------------
 * HELPERS
 * ---------------------------------------------------------------------- */

function decodeBase64Url(str) {
    const padded =
        str.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - (str.length % 4)) % 4);

    return Buffer.from(padded, 'base64').toString('utf8');
}

function extractText(payload) {
    if (payload.mimeType === 'text/plain' && payload.body?.data) {
        return decodeBase64Url(payload.body.data);
    }

    if (payload.parts) {
        for (const part of payload.parts) {
            const text = extractText(part);
            if (text) return text;
        }
    }

    if (payload.mimeType === 'text/html' && payload.body?.data) {
        return decodeBase64Url(payload.body.data).replace(/<[^>]+>/g, ' ');
    }

    return null;
}

function buildQuery({ query = '', maxAgeMinutes }) {
    const parts = [];

    if (query) parts.push(query.trim());
    if (maxAgeMinutes) parts.push(`newer_than:${maxAgeMinutes}m`);

    return parts.join(' ');
}

/* -------------------------------------------------------------------------
 * PUBLIC API
 * ---------------------------------------------------------------------- */

async function initializeGmailAPI() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        throw new Error(`Missing credentials.json at ${CREDENTIALS_PATH}`);
    }
    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error(`Missing token.json at ${TOKEN_PATH}`);
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
    const { client_id, client_secret, redirect_uris } =
        credentials.installed || credentials.web;

    const auth = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    auth.setCredentials(token);

    auth.on('tokens', (tokens) => {
        if (tokens.refresh_token) token.refresh_token = tokens.refresh_token;
        if (tokens.access_token) token.access_token = tokens.access_token;
        if (tokens.expiry_date) token.expiry_date = tokens.expiry_date;
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
        console.log('[gmail] Token refreshed');
    });

    gmailClient = google.gmail({ version: 'v1', auth });
    console.log('[gmail] Gmail API ready');
}

async function getOtpFromGmail({
    query = 'OTP',
    maxAgeMinutes = 10,
    maxRetries = 40,
    retryDelay = 3000,
    otpRegex = /(\d{6})/,
    markAsRead = true,
} = {}) {
    if (!gmailClient) {
        throw new Error('Gmail API not initialized');
    }

    const finalQuery = buildQuery({ query, maxAgeMinutes });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(
            `[gmail] Attempt ${attempt}/${maxRetries} – query: "${finalQuery}"`
        );

        const listRes = await gmailClient.users.messages.list({
            userId: 'me',
            q: finalQuery,
            maxResults: 20,
            includeSpamTrash: true,
        });

        const messages = listRes.data.messages || [];
        console.log(`[gmail] Found ${messages.length} messages`);

        for (const { id } of messages) {
            const msg = await gmailClient.users.messages.get({
                userId: 'me',
                id,
                format: 'full',
            });

            const payload = msg.data.payload;
            const body = extractText(payload);
            if (!body) continue;

            const match = body.match(otpRegex);
            if (match) {
                const otp = match[1];
                console.log(`[gmail] ✅ OTP FOUND: ${otp}`);

                if (markAsRead) {
                    await gmailClient.users.messages.modify({
                        userId: 'me',
                        id,
                        requestBody: { removeLabelIds: ['UNREAD'] },
                    });
                }

                return otp;
            }
        }

        await new Promise((r) => setTimeout(r, retryDelay));
    }

    throw new Error('OTP not received after maximum retries');
}

module.exports = {
    initializeGmailAPI,
    getOtpFromGmail,
};
