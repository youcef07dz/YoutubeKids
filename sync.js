const https = require('https');
const fs = require('fs');
const path = require('path');

const CHANNELS = [
  'UCS7H8U-n5mINVJjJsaRtGHg',
  'UC9trsD1jCTXXtN3xIOIU8gg',
  'UCDeu_yKuIVxQJX1OUWXMedA',
  'UCEof7Z2iOP48t9a0HYoek7A',
  'UCZTLU39XbfN04FBXVc0vD1g',
  'UCuQKih3Ac3NABADQKQdeV6A',
  'UC9T90Azy2A0q2HZJS20iR1w'
];

const JSON_PATH = path.join(__dirname, 'video.json');
const PROXY = url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseFeed(xml) {
  const videos = [];
  const idMatches = [...xml.matchAll(/<yt:videoId>([\w-]{11})<\/yt:videoId>/g)];
  const titleMatches = [...xml.matchAll(/<media:title[^>]*>([^<]+)<\/media:title>/g)];
  const pubMatches = [...xml.matchAll(/<published>([^<]+)<\/published>/g)];

  for (let i = 0; i < idMatches.length; i++) {
    videos.push({
      id: idMatches[i][1],
      title: titleMatches[i]?.[1] || '',
      time: pubMatches[i]?.[1] ? new Date(pubMatches[i][1]).toLocaleDateString() : '',
      channel: '',
      duration: '',
      views: '',
      thumbnail: `https://img.youtube.com/vi/${idMatches[i][1]}/hqdefault.jpg`
    });
  }
  return videos;
}

async function sync() {
  console.log('Syncing channels...');
  let allVideos = [];
  const seen = new Set();

  if (fs.existsSync(JSON_PATH)) {
    const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));
    for (const v of existing) {
      if (v.id && !seen.has(v.id)) {
        seen.add(v.id);
        allVideos.push(v);
      }
    }
    console.log(`Existing: ${allVideos.length} videos`);
  }

  for (const ch of CHANNELS) {
    try {
      console.log(`Fetching ${ch}...`);
      const xml = await fetch(PROXY(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch}`));
      const newVids = parseFeed(xml);
      let added = 0;
      for (const v of newVids) {
        if (!seen.has(v.id)) {
          seen.add(v.id);
          allVideos.push(v);
          added++;
        }
      }
      console.log(`  ${newVids.length} found, ${added} new`);
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  allVideos.sort((a, b) => new Date(b.time) - new Date(a.time));
  fs.writeFileSync(JSON_PATH, JSON.stringify(allVideos, null, 2));
  console.log(`\nDone! Total: ${allVideos.length} videos saved to video.json`);
}

sync();
