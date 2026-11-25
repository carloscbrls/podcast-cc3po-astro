import { fetchEpisodes } from '../lib/episodes.ts';

/** Static search index over episode titles, show notes, and transcripts.
 *  Generated at build time alongside the episode pages it searches. */
export async function GET() {
  const episodes = await fetchEpisodes();
  const body = {
    generated: new Date().toISOString(),
    episodes: episodes.map((ep) => ({
      slug: ep.slug,
      num: ep.num,
      title: ep.title,
      text: [ep.descText, ...(ep.transcript || [])].join(' ').slice(0, 20000),
    })),
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
}
