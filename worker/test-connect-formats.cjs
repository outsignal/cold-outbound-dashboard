const { ProxyAgent } = require('undici');

const liAt = 'AQEDAQ7tw-MEUFRpAAABnGvI2SMAAAGcs97_hE0AYaVy7QZuJzX-bMu4RZkXIuKNEEK5f5lnBOfEaOeS7WIp3RIt-6TT5X_qZ_sPbmdzXbAMnkNHByao4eq6ULNFJOaiAl7fV_6e-7APLU46LBY6WkPC';
const jsessionId = 'ajax:8135603068034836257';
const proxy = new ProxyAgent('http://14a3ea8349d72:82454f8432@178.95.63.221:12323');

const memberUrn = 'ACoAAETytk0B64LCbZ68IvQEy97Iln66vKC6n8A';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/vnd.linkedin.normalized+json+2.1',
  'csrf-token': jsessionId,
  'x-restli-protocol-version': '2.0.0',
  'x-li-lang': 'en_US',
  'Cookie': `li_at=${liAt}; JSESSIONID="${jsessionId}"`,
  'Content-Type': 'application/json',
  'Referer': 'https://www.linkedin.com/in/eduardomiddleton/',
};

const trackingId = Buffer.from(Math.random().toString()).toString('base64').slice(0, 16);

// Try multiple payload formats
const formats = [
  {
    name: 'Format A: inviteeProfileUrn (fsd_profile)',
    body: {
      inviteeProfileUrn: `urn:li:fsd_profile:${memberUrn}`,
      trackingId,
    },
  },
  {
    name: 'Format B: invitee object with member URN',
    body: {
      invitee: {
        'com.linkedin.voyager.growth.invitation.InviteeProfile': {
          profileId: 'eduardomiddleton',
        },
      },
      trackingId,
    },
  },
  {
    name: 'Format C: invitee with memberUrn',
    body: {
      invitee: {
        'com.linkedin.voyager.growth.invitation.InviteeProfile': {
          profileUrn: `urn:li:fsd_profile:${memberUrn}`,
        },
      },
      trackingId,
    },
  },
  {
    name: 'Format D: urn:li:member numeric',
    body: {
      inviteeUrn: 'urn:li:member:1156757069',
      invitationType: 'CONNECTION',
      trackingId,
    },
  },
];

async function run() {
  for (const fmt of formats) {
    console.log(`\n--- ${fmt.name} ---`);
    console.log('Payload:', JSON.stringify(fmt.body));
    try {
      const resp = await fetch('https://www.linkedin.com/voyager/api/growth/normInvitations', {
        method: 'POST',
        headers,
        body: JSON.stringify(fmt.body),
        dispatcher: proxy,
      });
      console.log('Status:', resp.status);
      const text = await resp.text();
      console.log('Response:', text.slice(0, 500) || '(empty)');
      if (resp.status === 201 || resp.status === 200) {
        console.log('SUCCESS!');
        break;
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
  }
}

run().catch(function(e) { console.error('Fatal:', e.message); });
