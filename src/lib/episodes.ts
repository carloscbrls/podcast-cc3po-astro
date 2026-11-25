/**
 * Episode data — the Transistor RSS feed is the source of truth.
 * Fetched at build time; a publish-triggered rebuild (Transistor webhook →
 * Netlify build hook) makes a new episode's page appear when it publishes.
 * See TRANSCRIPT-LANE.md for how transcripts resolve.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface Chapter { time: string; seconds: number; label: string; }

export interface Episode {
  num: string;
  slug: string;
  title: string;
  dateISO: string;
  date: string;
  descHtml: string;
  descText: string;
  audio: string;
  link: string;
  durationSec: number;
  duration: string;
  durationISO: string;
  keywords: string;
  transcriptUrl: string;
  transcript: string[] | null;
  transcriptSource: 'reviewed' | 'auto' | null;
  chapters: Chapter[];
}

export const FEED_URL = 'https://feeds.transistor.fm/cc3po-podcast';

export function slugify(title: string): string {
  return title.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function isoDuration(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `PT${h ? `${h}H` : ''}${m}M${s}S`;
}

function parseChapters(text: string): Chapter[] {
  const out: Chapter[] = [];
  for (const line of text.split('\n')) {
    const m = line.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+[—–-]\s+(.+)$/) || line.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.{3,})$/);
    if (m) {
      const h = parseInt(m[1] || '0'), min = parseInt(m[2]), sec = parseInt(m[3]);
      out.push({ time: `${m[1] ? `${m[1]}:` : ''}${m[2]}:${m[3]}`, seconds: h * 3600 + min * 60 + sec, label: m[4].trim() });
    }
  }
  return out.length >= 2 ? out : [];
}

async function resolveTranscript(slug: string, transcriptUrl: string): Promise<{ paras: string[]; source: 'reviewed' | 'auto' } | null> {
  // 1) Reviewed transcript committed to the repo wins (transcript lane).
  const reviewedPath = join(process.cwd(), 'src', 'data', 'transcripts', `${slug}.txt`);
  try {
    if (existsSync(reviewedPath)) {
      const text = readFileSync(reviewedPath, 'utf-8').trim();
      if (text) return { paras: text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean), source: 'reviewed' };
    }
  } catch { /* fall through to auto */ }
  // 2) Transistor's auto-transcript, carried in the feed as podcast:transcript.
  if (transcriptUrl) {
    try {
      const res = await fetch(transcriptUrl);
      if (res.ok) {
        const text = (await res.text()).trim();
        if (text) return { paras: text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean), source: 'auto' };
      }
    } catch { /* no transcript this build */ }
  }
  return null;
}

const FALLBACK: Episode[] = [{
  num: '1', slug: 'own-your-stack', title: 'Own Your Stack',
  dateISO: '2026-11-23', date: 'Nov 23, 2026',
  descHtml: '<p>One idea in plain words for Central Valley small businesses: own your stack — the tools, accounts, and systems your business runs on should answer to you, not the other way around. Plus a 10-minute homework task and a short Spanish segment. Voiced with an AI clone of Carlos\'s voice, approved by Carlos.</p>',
  descText: 'One idea in plain words for Central Valley small businesses: own your stack — the tools, accounts, and systems your business runs on should answer to you, not the other way around. Plus a 10-minute homework task and a short Spanish segment. Voiced with an AI clone of Carlos\'s voice, approved by Carlos.',
  audio: 'https://media.transistor.fm/0bbc4eb8/c841c488.mp3',
  link: 'https://share.transistor.fm/s/0bbc4eb8',
  durationSec: 402, duration: '6:42', durationISO: 'PT6M42S',
  keywords: '', transcriptUrl: 'https://share.transistor.fm/s/0bbc4eb8/transcript.txt',
  transcript: null, transcriptSource: null, chapters: [],
}];

export async function fetchEpisodes(): Promise<Episode[]> {
  let episodes: Episode[] = [];
  try {
    const res = await fetch(FEED_URL);
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
    const parsed: Episode[] = [];
    for (const it of items) {
      const pick = (tag: string) => {
        const m = it.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
        return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
      };
      const enc = it.match(/<enclosure[^>]*url="([^"]+)"/);
      const tr = it.match(/<podcast:transcript[^>]*url="([^"]+)"/);
      const title = pick('title');
      if (!title) continue;
      const secs = parseInt(pick('itunes:duration')) || 0;
      const d = new Date(pick('pubDate'));
      const descHtml = pick('content:encoded') || pick('description');
      parsed.push({
        num: pick('itunes:episode') || '',
        slug: slugify(title),
        title,
        dateISO: isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10),
        date: isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }),
        descHtml,
        descText: descHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        audio: enc ? enc[1] : '',
        link: pick('link'),
        durationSec: secs,
        duration: secs ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '',
        durationISO: secs ? isoDuration(secs) : '',
        keywords: pick('itunes:keywords'),
        transcriptUrl: tr ? tr[1] : '',
        transcript: null, transcriptSource: null, chapters: [],
      });
    }
    episodes = parsed;
  } catch { /* fall back below */ }
  if (!episodes.length) episodes = [...FALLBACK];
  for (const ep of episodes) {
    const t = await resolveTranscript(ep.slug, ep.transcriptUrl);
    if (t) { ep.transcript = t.paras; ep.transcriptSource = t.source; }
    ep.chapters = parseChapters(ep.descText);
  }
  return episodes;
}

/** Verified distribution list (checked against the live show, Nov 23, 2026). */
export const PLATFORMS = [
  { name: 'Apple Podcasts', href: 'https://podcasts.apple.com/podcast/cc3po-podcast/id6838596218' },
  { name: 'Spotify', href: 'https://open.spotify.com/show/1Ix82Mlcww5eTH7xXnkVL7' },
  { name: 'Amazon Music', href: 'https://music.amazon.com/podcasts/4956d5c2-697d-40ff-ae4f-1c17248795e5' },
  { name: 'Pocket Casts', href: 'https://pca.st/m1ys6m9c' },
  { name: 'Deezer', href: 'https://www.deezer.com/show/1003788401' },
  { name: 'Podcast Addict', href: 'https://podcastaddict.com/podcast/cc3po-podcast/7390095' },
  { name: 'Player FM', href: 'https://player.fm/series/series-3777810' },
  { name: 'Overcast', href: 'https://overcast.fm/itunes6838596218' },
  { name: 'Castbox', href: 'https://castbox.fm/vic/6838596218' },
  { name: 'Castro', href: 'https://castro.fm/itunes/6838596218' },
  { name: 'Goodpods', href: 'https://www.goodpods.com/podcasts-aid/6838596218' },
  { name: 'RSS Feed', href: 'https://feeds.transistor.fm/cc3po-podcast' },
];

export interface Clip { title: string; file: string; poster: string; duration: string; note: string; }

/** Clips cleared for the site rail (finals from the shorts pipeline).
 *  Held pieces (personal/crisis material) and pieces awaiting the Spanish
 *  check are deliberately NOT in this list — see shorts-rotation.md. */
export const CLIPS: Clip[] = [
  { title: 'Own Your Stack', file: '/clips/clip3-own-your-stack-final.mp4', poster: '/clips/clip3-own-your-stack-final.png', duration: '0:27', note: 'The anchor line from Episode 1.' },
  { title: 'IT Humor', file: '/clips/clip1-it-humor-final.mp4', poster: '/clips/clip1-it-humor-final.png', duration: '0:36', note: 'The lightest piece in the set.' },
  { title: 'Music and AI', file: '/clips/clip4-music-and-ai-final.mp4', poster: '/clips/clip4-music-and-ai-final.png', duration: '0:34', note: 'Where the tech lane meets the catalog.' },
  { title: 'Follow and Join', file: '/clips/clip5-follow-and-join-final.mp4', poster: '/clips/clip5-follow-and-join-final.png', duration: '0:32', note: 'How to stay in the loop.' },
  { title: 'Emotional OS', file: '/clips/extra-a-emotional-os-final.mp4', poster: '/clips/extra-a-emotional-os-final.png', duration: '0:31', note: 'From the EMOTIONAL OS release.' },
];

/** Which clips belong on which episode page (by episode number). */
export const EPISODE_CLIPS: Record<string, string[]> = {
  '1': ['/clips/clip3-own-your-stack-final.mp4'],
};
