// Writes public/config.js from Vercel environment variables, so no keys live in git.
// Vercel → Project → Settings → Environment Variables:
//   SUPABASE_URL       e.g. https://<ref>.supabase.co   (dev now, prod before launch)
//   SUPABASE_ANON_KEY  the publishable / anon key — never the service_role key
const fs = require('fs');
const path = require('path');

// Trim: values pasted into Vercel easily pick up stray spaces/tabs/newlines.
const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const key = (process.env.SUPABASE_ANON_KEY || '').trim();
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable.');
  process.exit(1);
}

const out = path.join(__dirname, 'public', 'config.js');
fs.writeFileSync(out, `window.EVIDENT_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabaseKey: key })};\n`);
console.log('Wrote', out);
