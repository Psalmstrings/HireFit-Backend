require('dotenv').config();

async function testOne(modelName) {
  const apiKey = process.env.GEMINI_API_KEY;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello' }] }]
      })
    });
    clearTimeout(t);
    const data = await res.json();
    console.log(`[${modelName}] Status: ${res.status}`);
    if (res.status === 200) {
      console.log(`[${modelName}] Response:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 100));
      return true;
    } else {
      console.log(`[${modelName}] Error:`, data.error?.message?.slice(0, 150));
      return false;
    }
  } catch (e) {
    clearTimeout(t);
    console.log(`[${modelName}] Exception:`, e.message);
    return false;
  }
}

async function main() {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro-latest', 'gemini-3.8-flash', 'gemini-2.5-flash-lite'];
  for (const m of models) {
    await testOne(m);
  }
}

main();
