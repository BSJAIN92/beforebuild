const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { BLOCKS, createIdea, coverage, evidenceCount, safeUrl, cleanError, TIERS } = require('../.test-build/lib/model.js');
const { demoTurn, createDemoBackend } = require('../.test-build/lib/demo.js');
const { parseTurn, applyTurn } = require('../.test-build/lib/ai-contract.js');
const { toMarkdown } = require('../.test-build/lib/export.js');
const { escapeHtml, richText } = require('../.test-build/lib/ui.js');
const description = 'A small service helping freelance designers follow up on unpaid invoices.';
function idea(tier = 'basic') { return createIdea(description, tier, tier !== 'basic'); }
function turn() { return { title: 'Nudge', reply: 'Let’s test the customer problem.', question: 'How do people handle this today?', questionHint: 'Describe a recent example.', suggestions: [], complete: false, summary: '', canvas: BLOCKS.map(b => ({ block: b.key, items: [{ id: b.key + '-1', text: 'A proposed step to test', evidence: 'assumption', sourceIds: [] }] })), challenges: [{ id: 'pain', title: 'Urgency is not confirmed', detail: 'Ask about real incidents.', test: 'Talk to five prospects.', severity: 'high', sourceIds: [] }], experiments: [{ id: 'talk', title: 'Have five conversations', hypothesis: 'The problem recurs.', steps: 'Ask about their last experience.', metric: '3 of 5 report an active workaround.', effort: 'Five conversations', priority: 'high' }] }; }
function storage() { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k), clear: () => map.clear() }; }
beforeEach(() => { global.localStorage = storage(); });
for (const tier of ['basic', 'intermediate', 'advanced']) test(`${tier}: complete interview gives all nine blocks and a validation plan`, () => {
  let i = idea(tier);
  for (let n = 0; n < TIERS[tier].max; n++) i = demoTurn(i, `Founder response ${n + 1}`);
  assert.equal(i.answerCount, TIERS[tier].max); assert.equal(i.status, 'ready'); assert.equal(coverage(i), 9);
  assert.ok(i.challenges.length >= 3); assert.ok(i.experiments.every(e => e.hypothesis && e.steps && e.metric));
  if (tier === 'basic') assert.equal(i.reports.length, 0);
  else { assert.equal(i.reports.length, 1); assert.ok(i.reports[0].demo); assert.equal(i.reports[0].sources.length, 0); assert.match(i.reports[0].text, /No live searches/); }
});
test('unknown answers are assumptions, never founder evidence', () => {
  const i = demoTurn(idea(), 'I’m not sure yet.');
  assert.equal(i.canvas.customers[0].evidence, 'assumption'); assert.equal(evidenceCount(i, 'research'), 0);
});
test('early finish is explicit and fills all nine blocks', () => {
  const i = demoTurn(idea(), '', true); assert.equal(i.status, 'ready'); assert.equal(i.answerCount, 0); assert.equal(coverage(i), 9);
});
test('manual block edits and title survive AI updates', () => {
  const i = idea(); i.title = 'My chosen name'; i.titleEdited = true; i.editedBlocks = ['value'];
  i.canvas.value = [{ id: 'manual', text: 'My selected approach', evidence: 'founder', sourceIds: [], edited: true }];
  const out = applyTurn(i, turn()); assert.deepEqual(out.canvas.value, i.canvas.value); assert.equal(out.title, i.title);
});
test('demo coaching preserves locked blocks', () => {
  const i = idea(); i.editedBlocks = ['customers']; i.canvas.customers = [{ id: 'manual', text: 'My chosen customer', evidence: 'founder', sourceIds: [], edited: true }];
  assert.deepEqual(demoTurn(i, 'Different answer').canvas.customers, i.canvas.customers);
});
test('unknown research citations are removed and downgraded to assumptions', () => {
  const t = turn(); t.canvas[0].items[0].evidence = 'research'; t.canvas[0].items[0].sourceIds = ['invented'];
  const out = applyTurn(idea(), t); assert.equal(out.canvas.partners[0].evidence, 'assumption'); assert.deepEqual(out.canvas.partners[0].sourceIds, []);
});
test('known citation IDs preserve research attribution', () => {
  const i = idea('intermediate'); i.reports = [{ id: 'r', kind: 'intermediate', text: 'Cited report', createdAt: 1, demo: false, sources: [{ id: 's1', title: 'Product', url: 'https://example.com', accessedAt: 1 }] }];
  const t = turn(); t.canvas[0].items[0].evidence = 'research'; t.canvas[0].items[0].sourceIds = ['s1', 'made-up'];
  const out = applyTurn(i, t); assert.equal(out.canvas.partners[0].evidence, 'research'); assert.deepEqual(out.canvas.partners[0].sourceIds, ['s1']);
});
test('founder decisions and completed experiments survive subsequent model responses', () => {
  const i = applyTurn(idea(), turn()); i.challenges[0].decision = 'decline'; i.experiments[0].done = true;
  const t = turn(); t.challenges[0].id = 'new-risk'; t.experiments[0].id = 'new-test';
  const out = applyTurn(i, t); assert.equal(out.challenges.find(c => c.id === 'pain').decision, 'decline'); assert.equal(out.experiments.find(e => e.id === 'talk').done, true);
});
test('structured output rejects missing final blocks, duplicate blocks and empty entries', () => {
  const t = turn(); t.complete = true; t.canvas.pop(); assert.throws(() => parseTurn(JSON.stringify(t)), /missing a section/);
  const d = turn(); d.canvas[1] = d.canvas[0]; assert.throws(() => parseTurn(JSON.stringify(d)), /duplicate canvas/);
  const e = turn(); e.canvas[0].items[0].text = ''; assert.throws(() => parseTurn(JSON.stringify(e)), /empty or duplicate/);
  const f = turn(); f.experiments.push(f.experiments[0]); assert.throws(() => parseTurn(JSON.stringify(f)), /duplicate/);
});
test('AI cannot finish prematurely or omit the validation plan', () => {
  const t = turn(); t.complete = true; assert.throws(() => applyTurn(idea(), t), /before exploring/);
  const i = idea(); i.answerCount = 5; t.experiments = []; assert.throws(() => applyTurn(i, t), /validation plan/);
});
test('explicit early finish may bypass the usual interview minimum', () => {
  const t = turn(); t.complete = true; const out = applyTurn(idea(), t, true); assert.equal(out.status, 'ready'); assert.equal(coverage(out), 9);
});
test('unsafe links and HTML are not rendered as executable content', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,bad', 'file:///etc/passwd', 'https://secret:pass@example.com', 'not-a-url']) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  const result = richText('<script>alert(1)</script> [attack](javascript:alert) [source](https://example.com)');
  assert.ok(!result.includes('<script>')); assert.ok(!result.includes('href="javascript:')); assert.ok(result.includes('rel="noopener noreferrer"'));
});
test('Markdown export includes context, all blocks, decisions, experiments and demo disclaimer', () => {
  const i = demoTurn(idea('intermediate'), 'Designers', true); const text = toMarkdown(i);
  for (const b of BLOCKS) assert.ok(text.includes(b.label)); assert.ok(text.includes('## Interview')); assert.ok(text.includes('## Validation plan')); assert.ok(text.includes('not proof of demand'));
});
test('demo persists multiple ideas, upgrades preserve the same record and manual edits', async () => {
  const backend = createDemoBackend(); const id = await backend.create(description, 'basic', false);
  await backend.editBlock(id, 'value', [{ id: 'edit', text: 'A founder edit', evidence: 'founder', sourceIds: [] }]);
  await backend.rename(id, 'Chosen name'); await backend.upgrade(id, 'intermediate', true);
  const restored = createDemoBackend().snapshot().ideas[0]; assert.equal(restored.id, id); assert.equal(restored.tier, 'intermediate'); assert.equal(restored.title, 'Chosen name'); assert.equal(restored.canvas.value[0].text, 'A founder edit');
  await assert.rejects(() => backend.upgrade(id, 'basic', false), /deeper level/);
});
test('AI and research consent are recorded separately', () => {
  const basic = createIdea(description, 'basic', false, 'basic-id', true);
  const research = createIdea(description, 'advanced', true, 'research-id', true);
  assert.equal(basic.aiConsent, true); assert.equal(basic.researchConsent, false);
  assert.equal(research.aiConsent, true); assert.equal(research.researchConsent, true);
});
test('research consent and input bounds are enforced in demo operations', async () => {
  const b = createDemoBackend(); await assert.rejects(() => b.create(description, 'advanced', false, false), /allow AI-led/);
  await assert.rejects(() => b.create('tiny', 'basic', false, false), /20 characters/);
});
test('configuration details are removed from tester-facing AI errors', () => {
  assert.equal(cleanError(new Error('The AI service is not configured. Ask the beta owner to set OPENAI_API_KEY on Convex.')), 'The AI service is temporarily unavailable. Your work is saved. Please try again later.');
  assert.equal(cleanError(new Error('The AI service rejected its credentials or model permissions. Ask the beta owner to check the provider configuration.')), 'The AI service is temporarily unavailable. Your work is saved. Please try again later.');
});
test('cancel prevents a delayed demo response from overwriting the saved idea', async () => {
  const b = createDemoBackend(); const id = await b.create(description, 'basic', false); const pending = b.send(id, 'Freelancers');
  await b.cancel(id); await pending; const i = b.snapshot().ideas[0]; assert.equal(i.status, 'draft'); assert.equal(i.answerCount, 0); assert.equal(coverage(i), 0);
});
test('demo allowlist normalizes addresses and refuses enabled billing', async () => {
  const b = createDemoBackend(); await b.invite('  BETA@EXAMPLE.COM ', true); assert.equal(b.snapshot().invites[0].email, 'beta@example.com');
  await b.invite('beta@example.com', false); assert.equal(b.snapshot().invites[0].active, false);
  await assert.rejects(() => b.savePricing({ enabled: true, currency: 'USD', intermediate: 10, advanced: 25 }), /Billing must stay disabled/);
});
test('unavailable or corrupted browser storage does not crash the demo', () => {
  global.localStorage = { getItem() { throw new Error('blocked'); } }; const b = createDemoBackend(); assert.equal(b.snapshot().storageAvailable, false); assert.equal(b.snapshot().ideas.length, 0);
  global.localStorage = { getItem() { return '{invalid'; } }; assert.equal(createDemoBackend().snapshot().ideas.length, 0);
});
