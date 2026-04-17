const API_KEYS = [
  import.meta.env.VITE_OPENROUTER_API_KEY,
  import.meta.env.VITE_OPENROUTER_API_KEY_SECONDARY
].filter(k => k && k !== 'undefined');

// Model hierarchy: Primary (Smart but prone to overload), Fallback (Fast and reliable)
const MODELS = [
  'deepseek/deepseek-r1-distill-qwen-32b',
  'google/gemini-2.0-flash-001' 
];

export const askGemini = async (prompt, systemContext = "", imagesArray = []) => {
  let lastError = null;

  for (const modelId of MODELS) {
    for (let i = 0; i < API_KEYS.length; i++) {
      const currentKey = API_KEYS[i];
      const controller = new AbortController();
      const timeoutMs = modelId === MODELS[0] ? 35000 : 70000; 
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const url = 'https://openrouter.ai/api/v1/chat/completions';
        const messages = [];
        if (systemContext) messages.push({ role: 'system', content: systemContext });
        messages.push({ role: 'user', content: prompt });

        console.log(`[AIChat] Attempting ${modelId} with Key ${i + 1}/${API_KEYS.length}...`);

        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentKey}`,
            'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
            'X-Title': 'Shnoor Meetings'
          },
          body: JSON.stringify({
            model: modelId,
            messages: messages,
            temperature: 0.7,
            top_p: 1
          })
        });

        const data = await response.json();
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorMsg = data.error?.message || `Status ${response.status}`;
          console.warn(`[AIChat] ${modelId} (Key ${i + 1}) failed: ${errorMsg}`);
          lastError = new Error(errorMsg);
          continue; 
        }

        const content = data.choices?.[0]?.message?.content;
        if (content) {
          console.log(`[AIChat] Successfully got response from ${modelId}`);
          // Return clean content string
          return content.trim();
        }
        
        throw new Error('AI returned an empty message body.');
      } catch (error) {
        clearTimeout(timeoutId);
        const errorType = error.name === 'AbortError' ? 'Timeout (Service Overloaded)' : error.message;
        console.warn(`[AIChat] Attempt failed for ${modelId} with Key ${i + 1}: ${errorType}`);
        lastError = new Error(errorType);
        continue; 
      }
    }
    console.log(`[AIChat] Model ${modelId} exhausted all keys. Moving to next model...`);
  }

  throw new Error(`All AI models and keys failed. Last error: ${lastError?.message || 'Unknown'}`);
};
