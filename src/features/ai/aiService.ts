export interface AudioExtractionResult {
  transcript: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
}

export async function processVoiceToFood(
  transcript: string,
  apiKey: string
): Promise<AudioExtractionResult> {
  if (!apiKey) {
    throw new Error('Gemini API Key is missing. Please add it in Settings.');
  }

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `You are a nutrition expert AI. The user has explicitly dictated the following meal in Indonesian or English: "${transcript}". Estimate the nutritional information. Provide a reasonable estimation for calories, protein, carbs, and fats based on standard portion sizes if not explicitly stated. Choose the best category from: Breakfast, Lunch, Dinner, Snacks.`
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: 'Name of the primary food item or meal.' },
          calories: { type: 'INTEGER', description: 'Total estimated calories in kcal.' },
          protein: { type: 'INTEGER', description: 'Total estimated protein in grams.' },
          carbs: { type: 'INTEGER', description: 'Total estimated carbohydrates in grams.' },
          fats: { type: 'INTEGER', description: 'Total estimated fat in grams.' },
          category: {
            type: 'STRING',
            enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'],
            description: 'The meal category that best fits.'
          }
        },
        required: ['name', 'calories', 'protein', 'carbs', 'fats', 'category']
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    let errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      errorText = errorJson.error?.message || errorText;
    } catch {}
    throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
  }

  const jsonResponse = await response.json();
  const rawContent = jsonResponse.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawContent) {
    throw new Error('Failed to parse a valid response from Gemini.');
  }

  const result: AudioExtractionResult = JSON.parse(rawContent);
  // Re-inject the native transcript into the returned payload for UI rendering
  result.transcript = transcript;
  return result;
}
