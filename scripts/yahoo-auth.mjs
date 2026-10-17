// One-time helper: turns a Yahoo authorization code into a long-lived refresh token.
// Usage: node scripts/yahoo-auth.mjs <CLIENT_ID> <CLIENT_SECRET> [CODE]
const [clientId, clientSecret, code] = process.argv.slice(2);
const REDIRECT_URI = 'https://localhost:8080';

if (!clientId || !clientSecret) {
  console.error('Usage: node scripts/yahoo-auth.mjs <CLIENT_ID> <CLIENT_SECRET> [CODE]');
  process.exit(1);
}

if (!code) {
  const authUrl = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code`;
  console.log('1. Open this URL, log in to Yahoo, and click Agree:\n\n' + authUrl);
  console.log('\n2. The browser will land on a page that fails to load. That is expected.');
  console.log('   Copy the value after "code=" from the address bar, then run:\n');
  console.log('   node scripts/yahoo-auth.mjs <CLIENT_ID> <CLIENT_SECRET> <CODE>');
  process.exit(0);
}

const res = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
  method: 'POST',
  headers: {
    Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
});
const data = await res.json();
if (!res.ok || !data.refresh_token) {
  console.error('Token exchange failed:', data);
  process.exit(1);
}
console.log('\nSuccess! Save this as the GitHub secret YAHOO_REFRESH_TOKEN:\n\n' + data.refresh_token);
