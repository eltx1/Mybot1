import test from 'node:test';
import assert from 'node:assert/strict';
import { PROMPT_DEFAULTS, renderTemplate, defaultPromptMap } from '../lib/prompt-registry.js';

test('default prompts include all OpenAI use-cases', () => {
  const keys = PROMPT_DEFAULTS.map(p => p.key).sort();
  assert.deepEqual(keys, ['ai-role', 'demo-ai-rule']);
});

test('renderTemplate keeps exact static text and injects variables', () => {
  const map = defaultPromptMap();
  const rendered = renderTemplate(map['ai-role'].userPromptTemplate, {
    budget: 100,
    snapshotText: '{"symbol":"BTCUSDT"}',
    summaryLanguage: 'English'
  });
  assert.match(rendered, /You have 100 USDT/);
  assert.match(rendered, /\{"symbol":"BTCUSDT"\}/);
  assert.match(rendered, /write it in English\./);
});

test('renderTemplate returns empty when variable missing for safe preview', () => {
  const out = renderTemplate('hello {{name}} {{missing}}', { name: 'world' });
  assert.equal(out, 'hello world ');
});
