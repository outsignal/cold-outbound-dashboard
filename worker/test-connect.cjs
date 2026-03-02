const { ProxyAgent } = require('undici');

const liAt = 'AQEDAQ7tw-MEUFRpAAABnGvI2SMAAAGcs97_hE0AYaVy7QZuJzX-bMu4RZkXIuKNEEK5f5lnBOfEaOeS7WIp3RIt-6TT5X_qZ_sPbmdzXbAMnkNHByao4eq6ULNFJOaiAl7fV_6e-7APLU46LBY6WkPC';
const jsessionId = 'ajax:8135603068034836257';
const proxy = new ProxyAgent('http://14a3ea8349d72:82454f8432@178.95.63.221:12323');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'csrf-token': jsessionId,
  'x-restli-protocol-version': '2.0.0',
  'x-li-lang': 'en_US',
  'Cookie': `li_at=${liAt}; JSESSIONID="${jsessionId}"`,
};

async function run() {
  // Step 1: Auth check
  console.log('Step 1: Auth check (/me)...');
  const me = await fetch('https://www.linkedin.com/voyager/api/me', { headers, dispatcher: proxy, redirect: 'manual' });
  console.log('/me status:', me.status);
  if (me.status !== 200) {
    console.log('AUTH FAILED');
    console.log('clear-site-data:', me.headers.get('clear-site-data'));
    return;
  }
  console.log('AUTH OK');

  // Step 2: View Eduardo profile
  console.log('\nStep 2: View Eduardo profile...');
  const prof = await fetch('https://www.linkedin.com/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=eduardomiddleton&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-6', { headers, dispatcher: proxy });
  console.log('Profile status:', prof.status);
  const data = await prof.json();
  const elements = data.data ? (data.data['*elements'] || []) : [];
  const entityUrn = elements[0] || null;
  const memberUrn = entityUrn ? entityUrn.replace('urn:li:fsd_profile:', '') : null;
  console.log('Member URN:', memberUrn);

  // Step 3: Connection request
  console.log('\nStep 3: Sending connection request...');
  const body = {
    inviteeUrn: `urn:li:fsd_profile:${memberUrn}`,
    invitationType: 'CONNECTION',
    trackingId: Buffer.from(Math.random().toString()).toString('base64').slice(0, 16),
  };
  console.log('Payload:', JSON.stringify(body));
  const connResp = await fetch('https://www.linkedin.com/voyager/api/growth/normInvitations', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'Referer': 'https://www.linkedin.com/in/eduardomiddleton/' },
    body: JSON.stringify(body),
    dispatcher: proxy,
  });
  console.log('Connection status:', connResp.status);
  const connBody = await connResp.text();
  console.log('Response:', connBody || '(empty)');
}

run().catch(function(e) { console.error('Error:', e.message, e.cause ? e.cause.message : ''); });
