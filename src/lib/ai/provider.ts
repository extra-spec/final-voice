export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }
export interface AIProvider { reply(messages: ChatMessage[]): Promise<string> }

export class GroqProvider implements AIProvider {
  constructor(private apiKey: string, private model: string) {}
  async reply(messages: ChatMessage[]): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, messages, temperature: 0.5, max_tokens: 220 }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Groq ${res.status}: ${text.slice(0, 500)}`);
    const out = JSON.parse(text)?.choices?.[0]?.message?.content;
    if (typeof out !== "string" || !out.trim()) throw new Error(`Groq returned no text: ${text.slice(0, 500)}`);
    return out.trim();
  }
}

/** Offline stand-in so the page and route can be tested without a key. Not used in the real demo. */
export class MockProvider implements AIProvider {
  async reply(messages: ChatMessage[]): Promise<string> {
    const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    return `(mock reply) You said: ${last.slice(0, 80)}`;
  }
}
