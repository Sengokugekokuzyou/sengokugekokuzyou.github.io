import http from 'node:http';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const credentialPath = process.argv[2];
if (!credentialPath) {
  console.error('Usage: node .github/scripts/google-oauth-local.mjs "C:\\path\\to\\client_secret_....json"');
  process.exit(1);
}

const credentials = JSON.parse(await fs.readFile(credentialPath, 'utf8'));
const client = credentials.installed || credentials.web;
if (!client?.client_id || !client?.client_secret) {
  console.error('OAuth client JSON is missing client_id or client_secret.');
  process.exit(1);
}

const scopes = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/adsense.readonly'
];

const port = Number(process.env.OAUTH_PORT || 53682);
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
const state = randomUUID();

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', redirectUri);
  if (url.pathname !== '/oauth2callback') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  if (url.searchParams.get('state') !== state) {
    response.writeHead(400);
    response.end('State mismatch. Close this tab and run the script again.');
    server.close();
    return;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    response.writeHead(400);
    response.end(`Google did not return a code: ${url.searchParams.get('error') || 'unknown error'}`);
    server.close();
    return;
  }

  try {
    const token = await exchangeCodeForToken(code);
    await fs.writeFile('google-oauth-token.local.json', `${JSON.stringify({
      GOOGLE_OAUTH_CLIENT_ID: client.client_id,
      GOOGLE_OAUTH_CLIENT_SECRET: client.client_secret,
      GOOGLE_OAUTH_REFRESH_TOKEN: token.refresh_token || '',
      GA4_PROPERTY_ID: '539915731',
      SEARCH_CONSOLE_SITE_URL: 'https://sengokugekokuzyou.github.io/'
    }, null, 2)}\n`, 'utf8');

    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<h1>Codex連携OK</h1><p>ブラウザは閉じて大丈夫です。トークンを google-oauth-token.local.json に保存しました。</p>');
    console.log('OK: wrote google-oauth-token.local.json');
    console.log('Next: add these values to GitHub Actions secrets. Do not commit this file.');
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error.message);
    console.error(error.message);
  } finally {
    server.close();
  }
});

server.listen(port, '127.0.0.1', () => {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', client.client_id);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes.join(' '));
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  console.log('Open this URL and approve access:');
  console.log(authUrl.toString());
  if (process.env.OAUTH_OPEN_BROWSER !== '0') {
    openBrowser(authUrl.toString());
  }
});

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    client_id: client.client_id,
    client_secret: client.client_secret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${json.error_description || json.error || response.status}`);
  }
  if (!json.refresh_token) {
    throw new Error('Google did not return a refresh token. Re-run after removing this app access from your Google Account, or keep prompt=consent.');
  }
  return json;
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    spawn('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      'Start-Process -FilePath $args[0]',
      url
    ], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }
  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}
