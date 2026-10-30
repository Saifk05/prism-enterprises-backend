require('dotenv').config();

const { google } = require('googleapis');
const readline = require('node:readline');

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
} = process.env;

// ========================================================
// VALIDATE ENVIRONMENT VARIABLES
// ========================================================

if (
  !GOOGLE_CLIENT_ID ||
  !GOOGLE_CLIENT_SECRET ||
  !GOOGLE_REDIRECT_URI
) {
  console.error(
    '\nERROR: Missing Google OAuth credentials in backend/.env'
  );

  process.exit(1);
}

// ========================================================
// GOOGLE OAUTH CLIENT
// ========================================================

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// ========================================================
// GMAIL PERMISSIONS
// ========================================================

const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

// ========================================================
// GENERATE AUTHORIZATION URL
// ========================================================

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: scopes
});

// ========================================================
// TERMINAL INPUT
// ========================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ========================================================
// EXTRACT AUTHORIZATION CODE
// ========================================================

function extractAuthorizationCode(input) {
  let value = input.trim();

  // Remove surrounding quotes or angle brackets
  value = value.replace(/^[<"']+|[>"']+$/g, '');

  // Accept the complete Google callback URL
  if (
    value.startsWith('http://') ||
    value.startsWith('https://')
  ) {
    const url = new URL(value);

    const code = url.searchParams.get('code');

    if (!code) {
      throw new Error(
        'No authorization code found in the callback URL'
      );
    }

    return code;
  }

  // Accept code=4/...
  if (value.startsWith('code=')) {
    value = value.substring(5);
  }

  // Remove additional query parameters
  value = value.split('&')[0];

  // Decode URL-encoded values
  return decodeURIComponent(value);
}

// ========================================================
// START AUTHORIZATION
// ========================================================

console.log('\n==========================================');
console.log(' PRISM ENTERPRISES - GMAIL AUTHORIZATION');
console.log('==========================================\n');

console.log('Step 1: Open this URL in Chrome:\n');

console.log(authUrl);

console.log('\nStep 2: Sign in using info@atnav.in');

console.log('Step 3: Click Allow');

console.log(
  'Step 4: Copy the complete localhost callback URL'
);

console.log(
  'Step 5: Paste that URL into this terminal\n'
);

// ========================================================
// EXCHANGE AUTHORIZATION CODE
// ========================================================

rl.question(
  'Paste authorization code OR complete callback URL here: ',
  async (input) => {
    try {
      const code = extractAuthorizationCode(input);

      if (!code) {
        throw new Error('Authorization code is empty');
      }

      console.log('\nExchanging authorization code...');

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.error(
          '\nNo refresh token was returned.'
        );

        console.error(
          'Make sure access_type is offline and prompt is consent.'
        );

        return;
      }

      console.log('\n==========================================');
      console.log(' GMAIL AUTHORIZATION SUCCESSFUL');
      console.log('==========================================');

      console.log('\nRefresh token generated successfully.');

      console.log(
        '\nAdd the refresh token to your backend/.env file:'
      );

      // Display locally only; never share this value.
      console.log('\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);

      console.log('\nGMAIL_ACCOUNT=info@atnav.in');

      console.log(
        '\nIMPORTANT: Keep the refresh token private.'
      );

    } catch (error) {
      console.error('\n==========================================');
      console.error(' GMAIL AUTHORIZATION FAILED');
      console.error('==========================================');

      console.error('\nError:', error.message);

      if (error.message === 'invalid_grant') {
        console.error(
          '\nPossible causes:'
        );

        console.error(
          '1. Authorization code expired.'
        );

        console.error(
          '2. Authorization code was already used.'
        );

        console.error(
          '3. OAuth redirect URI does not match.'
        );

        console.error(
          '4. OAuth client credentials do not match.'
        );

        console.error(
          '\nRun the generator again and authorize with a fresh code.'
        );
      }

    } finally {
      rl.close();
    }
  }
);