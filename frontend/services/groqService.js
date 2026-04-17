const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export const transcribeAudioChunk = async (audioBlob, language = 'en', shouldTranslate = false) => {
  if (!GROQ_API_KEY) {
    console.error('Groq API Key is missing. Check your .env file.');
    return '';
  }

  // Ensure we use a compatible mime type. 
  // Whisper on Groq handles webm, mp3, mp4, mpeg, mpga, m4a, wav, and flac.
  const file = new File([audioBlob], 'chunk.webm', { type: 'audio/webm' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('model', 'whisper-large-v3'); 
  formData.append('response_format', 'json');
  
  if (!shouldTranslate && language !== 'auto') {
    formData.append('language', language);
  }

  const endpoint = shouldTranslate 
    ? 'https://api.groq.com/openai/v1/audio/translations'
    : 'https://api.groq.com/openai/v1/audio/transcriptions';

  console.log(`[GroqService] Sending ${Math.round(audioBlob.size / 1024)}KB chunk to ${shouldTranslate ? 'Translations' : 'Transcriptions'}...`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[GroqService] API Error:', data.error);
      throw new Error(data.error?.message || `Groq service failed with status: ${response.status}`);
    }

    if (data.text) {
      console.log(`[GroqService] Success: "${data.text.substring(0, 30)}..."`);
    }

    return data.text ? data.text.trim() : '';
  } catch (error) {
    console.error(`Error in Groq ${shouldTranslate ? 'translation' : 'transcription'} service:`, error);
    return '';
  }
};
