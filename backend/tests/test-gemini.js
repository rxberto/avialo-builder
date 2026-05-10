import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../src/config/env.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

const result = await model.generateContent(
  '¿Qué información necesitas para crear una web para una empresa española?'
);

console.log('✅ Gemini responde:');
console.log(result.response.text());