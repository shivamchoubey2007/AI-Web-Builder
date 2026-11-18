import OpenAI from "openai";

// Lazily-initialised so the server boots even when AI_API_KEY is not set.
// The key is only required when an AI route is actually hit.
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (!_openai) {
        _openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.AI_API_KEY ?? "placeholder",
        });
    }
    return _openai;
}

// Proxy so callers can keep using `openai.chat.completions.create(...)` unchanged.
const openai = new Proxy({} as OpenAI, {
    get(_target, prop) {
        return (getOpenAI() as any)[prop];
    },
});

export default openai;