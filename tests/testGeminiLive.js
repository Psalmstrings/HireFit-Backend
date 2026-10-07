require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModel(modelName) {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(`Testing model: ${modelName}`);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  });
  try {
    const res = await model.generateContent('Return JSON: {"status": "success", "model": "' + modelName + '"}');
    console.log(`SUCCESS [${modelName}]:`, res.response.text());
  } catch (err) {
    console.error(`FAILED [${modelName}]:`, err.message);
  }
}

async function run() {
  await testModel('gemini-3.8-flash');
}

run();
