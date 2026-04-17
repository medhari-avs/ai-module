const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const PRIMARY_MODEL = 'deepseek/deepseek-r1-distill-qwen-32b';
const FALLBACK_MODEL = 'meta-llama/llama-3.1-70b-instruct';

const SYSTEM_PROMPT = `You are an intelligent AI meeting assistant for Shnoor Meetings — a video conferencing platform.
You help participants during video calls. You can:
- Answer questions
- Summarize discussions
- Help draft messages or action items
- Provide meeting tips and etiquette advice
- Answer general knowledge questions

Keep your responses concise and helpful. You are embedded inside a video call interface.`;

export async function sendMessageToDeepSeek(conversationHistory, onChunk) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set. Add VITE_OPENROUTER_API_KEY to your .env file.');
  }

  // Try primary model first, then fallback if it fails
  try {
    return await callOpenRouter(PRIMARY_MODEL, conversationHistory, onChunk);
  } catch (error) {
    console.warn(`Primary model (${PRIMARY_MODEL}) failed, trying fallback (${FALLBACK_MODEL})...`, error);
    try {
      return await callOpenRouter(FALLBACK_MODEL, conversationHistory, onChunk, 30000); // Shorter 30s timeout for fallback
    } catch (fallbackError) {
      console.error('All AI models failed:', fallbackError);
      throw fallbackError;
    }
  }
}

async function callOpenRouter(model, conversationHistory, onChunk, timeoutMs = 60000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...conversationHistory,
  ];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Shnoor Meetings AI Assistant',
      },
      body: JSON.stringify({
        model: model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenRouter error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch {
          // Ignore parse errors for partial chunks
        }
      }
    }

    clearTimeout(timeoutId);
    return fullText;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`API Request timed out after ${timeoutMs/1000}s. The AI model may be overloaded.`);
    }
    throw error;
  }
}
