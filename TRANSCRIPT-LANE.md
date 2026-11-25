# The Transcript Lane — CC3PO Podcast

Every episode page carries its transcript as static HTML on the episode's own
URL. This document is the standing pipeline that keeps that true as episodes
publish. It exists because transcripts are the show's best-documented growth
mechanic (+6.68% unique visitors, 4.3× inbound links in the This American Life
study) and an accessibility obligation for an audio product.

## How a transcript reaches an episode page (build-time resolution)

`src/lib/episodes.ts` resolves each episode's transcript in this order:

1. **Reviewed file wins.** `src/data/transcripts/<episode-slug>.txt` in this
   repo — plain text, blank line between paragraphs. If it exists, it is what
   publishes, labeled "Transcript reviewed for names and terms."
2. **Transistor auto-transcript.** The RSS feed carries a
   `podcast:transcript` URL per episode; the build fetches it and publishes
   it labeled "Auto-generated transcript — names and terms may vary."
3. **Neither** → the episode page simply has no transcript section yet.

## The lane, step by step (per new episode)

1. **Publish** the episode in Transistor as usual. Transistor generates its
   own transcript shortly after publish; the episode page picks it up
   automatically on the next site rebuild (the publish webhook triggers one —
   see the Podcast Shift Change build note).
2. **Review pass** (agent flywheel or Carlos): when the transistor-webhook
   Worker's transcript polling drops a `transcript_ready` job, an agent pulls
   the auto-transcript, corrects names and terms against the audio (people,
   places, product names, Spanish segments), and commits the result as
   `src/data/transcripts/<slug>.txt`. From then on the reviewed text is what
   the site serves. Transistor's own support docs warn its AI transcripts err
   on names/terms — the review is a real step, not a rubber stamp.
3. **If Transistor's transcript is missing entirely**, transcribe the audio
   with whisper on the Village droplet (base or small model, serialized — per
   the host-sizing verdict, the droplet cannot run larger models alongside
   the MCP stack), or route it through the Nivel/MADRUGÁ audio lane, then do
   the same review pass and commit the file.

## Review rules

- Correct **names and terms** only (orthography of what was said — e.g.
  "III Cabrales" for the spoken "triple-i Cabrales", "cc3po.com" for
  "cc three p o dot com"). Never reword, soften, or summarize Carlos's words.
- Keep paragraph breaks where the speaker pauses; one idea per paragraph.
- Spanish segments stay in Spanish, spelled correctly.
- The Episode 1 file (`own-your-stack.txt`) is the worked example: it is
  Transistor's auto-transcript with exactly those two orthographic fixes.

## Why static HTML, not a widget

Search engines and screen readers get the words as part of the page; the
episode search (`/search-index.json`, generated in the same build) indexes
notes + transcripts together, so a listener can find the moment they half
remember. No third-party transcript service, per the forms/spine ruling.
