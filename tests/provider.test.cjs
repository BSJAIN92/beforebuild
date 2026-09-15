const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { provider, researchReport } = require('../.test-build/convex/providers.js');
const { createIdea } = require('../.test-build/lib/model.js');
const originalFetch = global.fetch;
let requests;
async function requestDetails(input, options) {
  if (input instanceof Request) return { url: input.url, headers: Object.fromEntries(input.headers), body: JSON.parse(await input.clone().text()) };
  return { url: String(input), headers: Object.fromEntries(new Headers(options?.headers)), body: options?.body ? JSON.parse(options.body) : undefined };
}
beforeEach(() => {
  requests = []; process.env.OPENAI_API_KEY = 'not-a-real-test-key'; process.env.GEMINI_API_KEY = 'not-a-real-gemini-key';
  for (const k of ['AI_PROVIDER','OPENAI_BASE_URL','AI_INTERVIEW_MODEL','AI_RESEARCH_MODEL','AI_DEEP_RESEARCH_MODEL','AI_DEEP_SEARCH_TOOL','GEMINI_MODEL']) delete process.env[k];
  global.fetch = async (url, options) => { requests.push({ url, ...options, body: options.body ? JSON.parse(options.body) : undefined }); return Response.json({ id: 'resp_mock', status: 'queued' }); };
});
after(() => { global.fetch = originalFetch; delete process.env.OPENAI_API_KEY; delete process.env.GEMINI_API_KEY; });
function idea(tier) { const value = createIdea('A service helping freelance designers follow up on unpaid invoices.', tier, false); value.researchConsent = tier !== 'basic'; return value; }
test('Basic cannot run native web research', async () => { await assert.rejects(() => provider().startResearch(idea('basic')), /not permitted/); assert.equal(requests.length, 0); });
test('Zero-credit or rate-limit responses expose no provider body or secret', async () => {
  global.fetch = async () => new Response('billing account detail / private request / not-a-real-test-key', { status: 429 });
  await assert.rejects(() => provider().interview(idea('basic'), false), error => /rate or spending limit/.test(error.message) && !/billing account detail|private request|not-a-real-test-key/.test(error.message));
});
test('Intermediate uses provider-native web search in background mode', async () => {
  await provider().startResearch(idea('intermediate')); const r = requests[0];
  assert.equal(r.url, 'https://api.openai.com/v1/responses'); assert.equal(r.body.tools[0].type, 'web_search'); assert.equal(r.body.tool_choice, 'required'); assert.equal(r.body.background, true); assert.equal(r.body.max_tool_calls, 7);
});
test('Advanced uses a separate deep research model and tool budget', async () => {
  process.env.AI_DEEP_RESEARCH_MODEL = 'my-approved-deep-model'; await provider().startResearch(idea('advanced')); const r = requests[0].body;
  assert.equal(r.model, 'my-approved-deep-model'); assert.equal(r.tools[0].type, 'web_search_preview'); assert.equal(r.max_tool_calls, 35); assert.equal(r.background, true); assert.equal(r.tool_choice, undefined);
});
test('Interview uses structured output, store=false, and no web tools', async () => {
  const turn = { title: 'Test', reply: 'Thanks.', question: 'What are people using today?', questionHint: 'Think about their workaround.', suggestions: [], summary: '', canvas: [], challenges: [], experiments: [] };
  global.fetch = async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return Response.json({ id: 'resp_mock', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(turn) }] }] }); };
  const result = await provider().interview(idea('basic'), false); const request = requests[0].body;
  assert.equal(result.question, turn.question); assert.equal(result.complete, false); assert.equal(request.store, false); assert.equal(request.tools, undefined); assert.equal(request.text.format.type, 'json_schema'); assert.equal(request.text.format.strict, true); assert.equal(request.text.format.schema.properties.complete, undefined);
});
test('backend keeps the interview open when the tier minimum is reached', async () => {
  const value = idea('basic'); value.answerCount = 3;
  const turn = { title: 'Test', reply: 'Thanks.', question: 'What is the smallest test you can run?', questionHint: 'Choose one action this week.', suggestions: [], summary: '', canvas: [], challenges: [], experiments: [] };
  global.fetch = async (url, options) => Response.json({ id: 'resp_mock', status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(turn) }] }] });
  const result = await provider().interview(value, false);
  assert.equal(result.complete, false); assert.equal(result.question, turn.question);
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
test('Provider response IDs are not exposed through report or source IDs', () => {
  const providerId = 'resp_PRIVATE_CORRELATION_123456789';
  const response = { id: providerId, status: 'completed', output: [{ content: [{ type: 'output_text', text: 'Evidence.', annotations: [{ type: 'url_citation', url: 'https://example.com/evidence', title: 'Evidence', start_index: 0, end_index: 9 }] }] }] };
  const result = researchReport(response, 'intermediate');
  assert.equal(result.id.includes(providerId), false);
  assert.equal(result.sources.some(source => source.id.includes(providerId) || providerId.includes(source.id)), false);
});
test('Source-free research fails closed rather than masquerading as evidence', () => {
  assert.throws(() => researchReport({ id: 'resp_fake', status: 'completed', output: [{ content: [{ type: 'output_text', text: '[made-up](https://example.com)' }] }] }, 'intermediate'), /no verifiable source/);
});
test('Provider response IDs cannot escape the expected API path', async () => {
  assert.throws(() => provider().retrieve('../unexpected'), /invalid response identifier/); assert.equal(requests.length, 0);
});

test('Gemini interview uses JSON mode, strict local instructions, and no Basic search tool', async () => {
  process.env.AI_PROVIDER = 'gemini';
  const turn = { title: 'Test', reply: 'Thanks.', question: 'What are people using today?', questionHint: 'Think about their workaround.', suggestions: [], summary: '', canvas: [], challenges: [], experiments: [] };
  global.fetch = async (input, options) => { requests.push(await requestDetails(input, options)); return Response.json({ id: 'int_test', status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: JSON.stringify(turn) }] }] }); };
  const result = await provider().interview(idea('basic'), false); const request = requests[0];
  assert.equal(result.question, turn.question); assert.match(request.url, /\/interactions$/); assert.equal(request.body.model, 'gemini-3.8-flash');
  assert.equal(request.body.response_format.schema.properties.complete, undefined);
  assert.ok(!JSON.stringify(request.body.response_format.schema).includes('maxItems'));
  assert.ok(!JSON.stringify(request.body.response_format.schema).includes('maxLength'));
  assert.equal(request.body.response_format.type, 'text'); assert.equal(request.body.response_format.mime_type, 'application/json');
  assert.ok(request.body.system_instruction.includes('The complete nested JSON schema is:'));
  assert.equal(request.body.store, false); assert.equal(request.body.tools, undefined); assert.equal(request.body.safety_settings, undefined);
  assert.equal(request.headers['x-goog-api-key'], 'not-a-real-gemini-key'); assert.ok(!JSON.stringify(request.body).includes('not-a-real-gemini-key'));
});

test('Gemini Basic cannot start research and makes no request', async () => {
  process.env.AI_PROVIDER = 'gemini'; await assert.rejects(() => provider().startResearch(idea('basic')), /not permitted/); assert.equal(requests.length, 0);
});

test('Gemini research uses Google Search grounding and converts supported citations', async () => {
  process.env.AI_PROVIDER = 'gemini';
  global.fetch = async (input, options) => { requests.push(await requestDetails(input, options)); return Response.json({ id: 'int_research', status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Competitors charge monthly.', annotations: [{ type: 'url_citation', url: 'https://example.com/pricing', title: 'Pricing', start_index: 0, end_index: 11 }] }] }] }); };
  const response = await provider().startResearch(idea('intermediate')); const request = requests[0].body;
  assert.deepEqual(request.tools, [{ type: 'google_search' }]); assert.equal(request.store, false); assert.equal(response.status, 'completed');
  const report = researchReport(response, 'intermediate'); assert.equal(report.sources.length, 1); assert.equal(report.sources[0].url, 'https://example.com/pricing');
});

test('Gemini source-free research is rejected before it can be saved', async () => {
  process.env.AI_PROVIDER = 'gemini'; global.fetch = async () => Response.json({ id: 'int_no_sources', status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Unsupported research.' }] }] });
  const response = await provider().startResearch(idea('advanced')); assert.throws(() => researchReport(response, 'advanced'), /no verifiable source/);
});

test('Gemini rejected configuration and malformed output fail safely', async () => {
  process.env.AI_PROVIDER = 'gemini';
  global.fetch = async () => Response.json({ error: { status: 'INVALID_ARGUMENT', message: 'Request rejected by safety settings.' } }, { status: 400 });
  await assert.rejects(() => provider().interview(idea('basic'), false), /rejected the configured model or tool/);
  global.fetch = async () => Response.json({ id: 'int_bad_json', status: 'completed', steps: [{ type: 'model_output', content: [{ type: 'text', text: '{bad json' }] }] });
  await assert.rejects(() => provider().interview(idea('basic'), false));
});

test('Gemini quota and credential errors expose no raw body or key', async () => {
  process.env.AI_PROVIDER = 'gemini'; let calls = 0;
  global.fetch = async () => { calls += 1; return new Response('private prompt / not-a-real-gemini-key', { status: 429 }); };
  await assert.rejects(() => provider().interview(idea('basic'), false), error => /rate or spending limit/.test(error.message) && !/private prompt|not-a-real-gemini-key/.test(error.message));
  assert.equal(calls, 1); calls = 0;
  global.fetch = async () => { calls += 1; return new Response('not-a-real-gemini-key', { status: 403 }); };
  await assert.rejects(() => provider().interview(idea('basic'), false), error => /credentials/.test(error.message) && !error.message.includes('not-a-real-gemini-key'));
  assert.equal(calls, 1);
});

test('Gemini diagnostics retain provider detail and email but redact API keys from public logs and stored records', async () => {
  process.env.AI_PROVIDER = 'gemini';
  const originalError = console.error; const logged = [];
  console.error = (...args) => logged.push(args);
  global.fetch = async () => Response.json({ error: { status: 'INVALID_ARGUMENT', message: 'Invalid generation_config for bsjcloud@gmail.com using not-a-real-gemini-key' } }, { status: 400 });
  let diagnostic;
  try { await assert.rejects(() => provider().interview(idea('basic'), false), error => { diagnostic = error.diagnostic; return /rejected the configured model or tool/.test(error.message); }); }
  finally { console.error = originalError; }
  assert.equal(logged.length, 1);
  assert.deepEqual(logged[0], ['Gemini request rejected', { provider: 'gemini', httpStatus: 400, providerStatus: 'INVALID_ARGUMENT', category: 'generation-config', message: 'Stored in the admin-only provider error table.' }]);
  const output = JSON.stringify(logged);
  assert.ok(!output.includes('not-a-real-gemini-key')); assert.ok(!output.includes('bsjcloud@gmail.com')); assert.ok(!output.includes('generation_config'));
  assert.equal(diagnostic.message, 'Invalid generation_config for bsjcloud@gmail.com using [REDACTED_API_KEY]');
});

test('Gemini timeout identity survives for the worker safe-timeout mapping', async () => {
  process.env.AI_PROVIDER = 'gemini'; global.fetch = async () => { throw new DOMException('private timeout details', 'TimeoutError'); };
  await assert.rejects(() => provider().interview(idea('basic'), false), error => error.name === 'TimeoutError');
});

test('Gemini cancellation is cooperative and makes no extra provider request', async () => {
  process.env.AI_PROVIDER = 'gemini'; const ai = provider(); await ai.cancel('local-reference'); await ai.remove('local-reference'); assert.equal(requests.length, 0);
  await assert.rejects(() => ai.retrieve('local-reference'), /does not use background retrieval/);
});

test('Provider selection fails closed and OpenAI remains available for rollback', async () => {
  process.env.AI_PROVIDER = 'unknown-provider'; assert.throws(() => provider(), /not supported/);
  process.env.AI_PROVIDER = 'openai'; await provider().startResearch(idea('intermediate')); assert.equal(requests[0].url, 'https://api.openai.com/v1/responses');
});
