// Optional server voice (OpenAI-compatible /v1/audio/speech). Clearer and louder than device voices.
// Configure TTS_API_KEY (or OPENAI_API_KEY). Without a key it answers 501 and the app uses the device voice.
export const maxDuration = 60;

export async function POST(req: Request) {
  const key = process.env.TTS_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ error: "TTS not configured" }, { status: 501 });
  const body = (await req.json().catch(() => null)) as { text?: string; lang?: string } | null;
  const text = body?.text?.slice(0, 3000).trim();
  if (!text) return Response.json({ error: "Missing text" }, { status: 400 });
  const es = body?.lang === "es";
  try {
    const r = await fetch(process.env.TTS_API_URL || "https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.TTS_VOICE || "nova",
        input: text,
        instructions: es
          ? "Hablá en español rioplatense, claro, cálido y a un ritmo tranquilo, como un técnico agrónomo explicándole a un productor."
          : "Speak clearly, warmly and at a calm pace, like an agronomist explaining to a farmer.",
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: `TTS unavailable: ${(e as Error).message}` }, { status: 502 });
  }
}
