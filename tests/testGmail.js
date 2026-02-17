const { initializeGmailAPI, getOtpFromGmail } = require('./gmailOtpReader');

async function testGmailConnection() {
    try {
        console.log('Testing Gmail API connection...\n');
        
        // Initialize API
        await initializeGmailAPI();
        
        console.log(' Checking for recent unread emails (last 5 minutes)...\n');
        
        // Try to fetch OTP (this will show what emails it finds)
        try {
            const otp = await getOtpFromGmail({
                maxRetries: 3,
                retryDelay: 2000,
                maxAgeMinutes: 5
            });
            
            console.log('TEST PASSED!');
            console.log(`   Found OTP: ${otp}\n`);
            
        } catch (error) {
            if (error.message.includes('OTP not received')) {
                console.log('CONNECTION WORKS!');
                console.log('   (No OTP emails found in last 5 minutes - this is normal)\n');
                console.log(' To test OTP extraction:');
                console.log('   1. Trigger a login on your app');
                console.log('   2. Run: npx playwright test tests/login.spec.js --headed\n');
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.error('\n TEST FAILED!');
        console.error(`   Error: ${error.message}\n`);
        
        if (error.message.includes('invalid_grant')) {
            console.error(' FIX: Your refresh token is expired or invalid.');
            console.error('   Get a new refresh token from OAuth Playground:\n');
            console.error('   1. Go to: https://developers.google.com/oauthplayground/');
            console.error('   2. Click Settings  → Use your own OAuth credentials');
            console.error('   3. Enter your client_id and client_secret');
            console.error('   4. Select Gmail API v1 → gmail.readonly');
            console.error('   5. Authorize and get the refresh token');
            console.error('   6. Update tests/token.json with the new refresh token\n');
        }
        
        process.exit(1);
    }
}

testGmailConnection();


