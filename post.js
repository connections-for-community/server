// save as post.js and run with: node post.js
const url = 'https://connections.app.n8n.cloud/webhook-test/venue-search';
// const url= 'http://localhost:5678/webhook-test/venue-search';

async function main() {
  const payload = {
    location: 'Vancouver',
    date: '2025-11-27',
    venueType: 'tennis courts'
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await res.text(); // or res.json()
  console.log('Status:', res.status);
  console.log('Body:', text);
}

main().catch(err => {
  console.error('Request failed:', err);
  process.exit(1);
});
