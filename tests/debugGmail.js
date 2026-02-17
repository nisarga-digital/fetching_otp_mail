// debugGmail.js
const { initializeGmailAPI, getOtpFromGmail } = require('./gmailOtpReader');

(async () => {
    try {
        console.log('TESTING GMAIL CONNECTION');
        await initializeGmailAPI();

        console.log(' Fetching OTP...');
        const otp = await getOtpFromGmail({ maxRetries: 10, retryDelay: 3000 });
        console.log(`OTP received: ${otp}`);
    } catch (err) {
        console.error(' ERROR:', err.message);
    }
})();
