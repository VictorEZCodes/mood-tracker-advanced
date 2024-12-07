const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export class AIHelper {
  static async getEmotionalSupport(moodData) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4-turbo-preview",
          messages: [{
            role: "system",
            content: "You are an empathetic emotional support assistant. Provide brief, caring responses focused on emotional support and practical coping strategies. Keep responses concise but meaningful."
          }, {
            role: "user",
            content: `My current mood is ${moodData.mood}/5. Journal entry: ${moodData.journal}. Tags: ${moodData.tags.join(', ')}`
          }],
          max_tokens: 150,
          temperature: 0.7,
          presence_penalty: 0.6,
          frequency_penalty: 0.6
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI Helper Error:', error);
      return "I'm having trouble connecting right now. Remember that it's okay to feel this way, and tomorrow is a new day.";
    }
  }
}