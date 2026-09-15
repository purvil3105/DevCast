const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  try {
    const result = await model.generateContent('Say hello world');
    console.log(result.response.text());
  } catch (err) {
    console.error('Error:', err.message);
  }
}
test();
