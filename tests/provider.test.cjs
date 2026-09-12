const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { provider, researchReport } = require('../.test-build/convex/providers.js');
const { createIdea } = require('../.test-build/lib/model.js');
const originalFetch = global.fetch;
let requests;
beforeEach(() => {
  requests = []; process.env.OPENAI_API_KEY = 'not-a-real-test-key';
  for (const k of ['AI_PROVIDER','OPENAI_BASE_URL','AI_INTERVIEW_MODEL','AI_RESEARCH_MODEL','AI_DEEP_RESEARCH_MODEL','AI_DEEP_SEARCH_TOOL']) delete process.env[k];
  global.fetch = async (url, options) => { requests.push({ url, ...options, body: options.body ? JSON.parse(options.body) : undefined }); return Response.json({ id: 'resp_mock', status: 'queued' }); };
});
after(() => { global.fetch = originalFetch; delete process.env.OPENAI_API_KEY; });
function idea(tier) { return createIdea('A service helping freelance designers follow up on unpaid invoices.', tier, tier !== 'basic'); }
test('Basic cannot run native web research', async () => { await assert.rejects(() => provider().startResearch(idea('basic')), /not permitted/); assert.equal(requests.length, 0); });
test('Intermediate uses provider-native web search in background mode', async () => {
  await provider().startResearch(idea('intermediate')); const r = requests[0];
  assert.equal(r.url, 'https://api.openai.com/v1/responses'); assert.equal(r.body.tools[0].type, 'web_search'); assert.equal(r.body.tool_choice, 'required'); assert.equal(r.body.background, true); assert.equal(r.body.max_tool_calls, 7);
});
test('Advanced uses a separate deep research model and tool budget', async () => {
  process.env.AI_DEEP_RESEARCH_MODEL = 'my-approved-deep-model'; await provider().startResearch(idea('advanced')); const r = requests[0].body;
  assert.equal(r.model, 'my-approved-deep-model'); assert.equal(r.tools[0].type, 'web_search_preview'); assert.equal(r.max_tool_calls, 35); assert.equal(r.background, true); assert.equal(r.tool_choice, undefined);
});
test('Interview uses structured output, store=false, and no web tools', async () => {
  const turn = { title: 'Test', reply: 'Thanks.', question: 'What are people using today?', questionHint: 'Think about their workaround.', suggestions: [], complete: false, summary: '', canvas: [], challenges: [], experiments: [] };
  global.fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return Response.json({ id: 'resp_mock', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(turn) }] }] }); };
  const result = await provider().interview(idea('basic'), false); const request = requests[0].body;
  assert.equal(result.question, turn.question); assert.equal(request.store, false); assert.equal(request.tools, undefined); assert.equal(request.text.format.type, 'json_schema'); assert.equal(request.text.format.strict, true);
});
test('Configured compatible endpoint is server-side and must use HTTPS', async () => {
  process.env.AI_PROVIDER = 'openai-compatible'; process.env.OPENAI_BASE_URL = 'https://gateway.example.com/v1'; await provider().startResearch(idea('intermediate')); assert.equal(requests[0].url, 'https://gateway.example.com/v1/responses');
  process.env.OPENAI_BASE_URL = 'http://gateway.example.com'; assert.throws(() => provider(), /HTTPS/);
});
test('Raw provider errors and secret-bearing bodies never reach the user', async () => {
  global.fetch = async () => new Response('secret-key-123 / private prompt', { status: 401 });
  await assert.rejects(() => provider().startResearch(idea('intermediate')), error => !error.message.includes('secret-key') && /credentials/.test(error.message));
});
test('Research sources come from native URL annotations, not model-invented links', () => {
  const response = { id: 'resp_example', status: 'completed', output: [{ content: [{ type: 'output_text', text: 'Evidence [1] and [2].', annotations: [{ type: 'url_citation', url: 'https://example.com/pricing', title: 'Actual pricing', start_index: 9, end_index: 12 }, { type: 'url_citation', url: 'https://example.com/pricing', title: 'Duplicate', start_index: 17, end_index: 20 }, { type: 'url_citation', url: 'javascript:alert(1)', title: 'Unsafe' }] }] }] };
  const result = researchReport(response, 'advanced'); assert.equal(result.sources.length, 1); assert.equal(result.demo, false); assert.ok(result.text.includes('[Actual pricing](https://example.com/pricing)')); assert.equal(result.kind, 'advanced');
});
test('Source-free research fails closed rather than masquerading as evidence', () => {
  assert.throws(() => researchReport({ id: 'resp_fake', status: 'completed', output: [{ content: [{ type: 'output_text', text: '[made-up](https://example.com)' }] }] }, 'intermediate'), /no verifiable source/);
});
test('Provider response IDs cannot escape the expected API path', async () => {
  assert.throws(() => provider().retrieve('../unexpected'), /invalid response identifier/); assert.equal(requests.length, 0);
});
