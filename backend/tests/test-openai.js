import OpenAI from 'openai';
import { config } from '../src/config/env.js';

const client = new OpenAI({ apiKey: config.openai.apiKey });

const response = await client.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'user',
      content: '¿Qué información necesitas para crear una web para una empresa española?'
    }
  ]
});

console.log('✅ OpenAI responde:');
console.log(response.choices[0].message.content);