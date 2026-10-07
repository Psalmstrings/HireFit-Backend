require('dotenv').config();

async function testFetchModel(modelName) {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`Testing fetch model: ${modelName}`);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with JSON only: {"status": "ok"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    console.log(`[${modelName}] Status:`, res.status);
    if (res.status === 200) {
      console.log(`[${modelName}] Success text:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
      return true;
    } else {
      console.log(`[${modelName}] Error:`, data.error?.message || data);
      return false;
    }
  } catch (err) {
    console.error(`[${modelName}] Fetch failed:`, err.message);
    return false;
  }
}

async function run() {
  const models = [
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash'
  ];
  for (const m of models) {
    const ok = await testFetchModel(m);
    if (ok) {
      console.log(`>>> BEST WORKING MODEL FOUND: ${m} <<<`);
      break;
    }
  }
}

run();
