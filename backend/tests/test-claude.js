import Anthropic from '@anthropic-ai/sdk';
import { config } from '../src/config/env.js';

const client = new Anthropic({ apiKey: config.anthropic.apiKey });

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: '¿Qué información necesitas para crear una web para una empresa española?'
    }
  ]
});

console.log('✅ Claude responde:');
console.log(response.content[0].text);