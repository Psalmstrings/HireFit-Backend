require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log('STATUS:', res.status);
    if (data.models) {
      console.log('AVAILABLE MODELS:', data.models.map(m => m.name.replace('models/', '')));
    } else {
      console.log('RESPONSE:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
}

listModels();
