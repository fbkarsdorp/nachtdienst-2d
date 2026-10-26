// Translates the archive's tale summaries that sagenland has not translated yet (its regions leave out Holland,
// Zeeland, Utrecht and others), with the same prompt and model, through the Message Batches API. Resumable: a submit
// only sends what is not in data/translations/ yet.
//
//   node tools/translate.mjs submit    send a batch for every untranslated summary (prints its id)
//   node tools/translate.mjs collect   wait for the batch, store data/translations/nachtdienst.opus.json, show the cost
//   node tools/translate.mjs direct    the same requests one by one instead, when a batch will not start (twice the price)
//   node tools/translate.mjs cancel    cancel the batch submitted last
//   node tools/translate.mjs missing   count what is still untranslated
//
// The key is read from ANTHROPIC_API_KEY, or from a line ANTHROPIC_API_KEY=... in .env.local here or in ../sagenland.

import fs from 'node:fs';

const MODEL = { id: 'claude-opus-5-5', input: 2, output: 10 }; // batch prices, dollars per million tokens
const CHUNK = 40;
const OUT = 'data/translations';
const RESULT = `${OUT}/nachtdienst.opus.json`, BATCH = `${OUT}/nachtdienst.batch.json`;
const TYPES = '../sagenland/public/data/meta.json';

// sagenland's prompt, word for word
const SYSTEM = `You translate short Dutch summaries of folk legends from the Dutch Folktale Database (Nederlandse Volksverhalenbank) into English. They appear in a game in which the player collects these tales, and the player reads each one on its own.

- Translate what is there, in plain, clear English, at about the same length and in the same tense. Do not embellish, explain or add detail.
- Keep Dutch and Flemish place names and personal names as they are.
- Use the usual English word for a being or practice when there is one (heks: witch, weerwolf: werewolf, dwaallicht: will-o'-the-wisp). When there is none, keep the Dutch word and add a short gloss in brackets, for example "witte wieven (white women)", "kollen (bewitching cattle)". Gloss each time, since every summary is read on its own. Treat the folklore terms voorloop (an apparition foreshadowing an event) and naloop (an apparition after a death) this way too.
- Some summaries contain dialect or old spelling; translate the meaning.
- Each item comes with the English name of its tale type as context. Do not include it in the translation.
- Plain text only: no markdown, no quotation marks around the whole translation.`;

const SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, en: { type: 'string' } },
        required: ['id', 'en'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
};

const readJson = (f, empty) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : empty);

function key() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  for (const f of ['.env.local', '../sagenland/.env.local']) {
    const m = fs.existsSync(f) && fs.readFileSync(f, 'utf8').match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('no ANTHROPIC_API_KEY');
}

// a dropped connection is tried again when only asking (the wait for a batch should not die of one bad minute);
// sending one is not, or it might be sent twice
async function api(path, init = {}, tries = init.method ? 1 : 5) {
  let res;
  try {
    res = await fetch(`https://api.anthropic.com/v1/${path}`, {
      ...init,
      headers: { 'x-api-key': key(), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    });
  } catch (e) {
    if (tries <= 1) throw e;
    await new Promise((r) => setTimeout(r, 30_000));
    return api(path, init, tries - 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

// every summary in the archive, with the English name of its tale type
function stories() {
  const all = [];
  globalThis.ARCHIVE_LOADED = (_, list) => all.push(...list);
  for (let i = 1; i <= 5; i++) new Function(fs.readFileSync(`data/archive/cabinet-${i}.js`, 'utf8'))();
  const types = readJson(TYPES, { types: {} }).types;
  return all
    .filter((s) => s.d?.trim())
    .map((s) => ({ id: String(s.n), type: types[parseInt((s.c || '').replace(/\D/g, ''), 10)]?.en ?? '', nl: s.d }));
}

function translated() {
  const done = {};
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.opus.json')) Object.assign(done, readJson(`${OUT}/${f}`, {}));
  return done;
}

const todo = () => {
  const done = translated();
  return stories().filter((s) => !(s.id in done));
};

// the requests for what is still untranslated, CHUNK summaries each
function requests_() {
  const items = todo();
  const requests = [];
  for (let i = 0; i < items.length; i += CHUNK)
    requests.push({
      custom_id: `opus-${i / CHUNK}`,
      params: {
        model: MODEL.id,
        max_tokens: 16000,
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Translate each summary into English. Return every id exactly once.\n\n${JSON.stringify(items.slice(i, i + CHUNK), null, 1)}`,
          },
        ],
      },
    });
  return { items, requests };
}

async function submit() {
  const { items, requests } = requests_();
  if (!requests.length) return console.log('nothing left to translate');
  const batch = await (await api('messages/batches', { method: 'POST', body: JSON.stringify({ requests }) })).json();
  fs.writeFileSync(BATCH, JSON.stringify({ id: batch.id }, null, 1));
  console.log(`${items.length} summaries; batch ${batch.id}: ${requests.length} requests`);
}

async function collect() {
  const { id } = readJson(BATCH, {});
  if (!id) throw new Error('no batch submitted');
  let batch = await (await api(`messages/batches/${id}`)).json();
  while (batch.processing_status !== 'ended') {
    const c = batch.request_counts;
    console.log(`${batch.processing_status}: ${c.processing} processing, ${c.succeeded} done`);
    await new Promise((r) => setTimeout(r, 60_000));
    batch = await (await api(`messages/batches/${id}`)).json();
  }
  const results = readJson(RESULT, {});
  const usage = { input: 0, output: 0 };
  const failed = [];
  const lines = (await (await api(`messages/batches/${id}/results`)).text()).split('\n').filter(Boolean);
  for (const line of lines) {
    const r = JSON.parse(line);
    if (r.result.type !== 'succeeded') {
      failed.push(`${r.custom_id} (${r.result.type})`);
      continue;
    }
    const msg = r.result.message;
    usage.input += msg.usage.input_tokens;
    usage.output += msg.usage.output_tokens;
    const text = msg.content.find((b) => b.type === 'text');
    if (msg.stop_reason !== 'end_turn' || !text) {
      failed.push(`${r.custom_id} (${msg.stop_reason})`);
      continue;
    }
    for (const t of JSON.parse(text.text).translations) results[t.id] = t.en.trim();
  }
  // keep only answers for summaries that exist: the model now and then garbles an id
  const ids = new Set(stories().map((s) => s.id));
  const kept = Object.fromEntries(Object.entries(results).filter(([k]) => ids.has(k)));
  fs.writeFileSync(RESULT, JSON.stringify(kept, null, 1));
  const cost = (usage.input * MODEL.input + usage.output * MODEL.output) / 1e6;
  console.log(`${Object.keys(kept).length} stored; ${usage.input} in, ${usage.output} out, $${cost.toFixed(2)}`);
  if (failed.length) console.log(`failed: ${failed.join(', ')}; submit again to retry`);
  console.log(`${todo().length} still untranslated`);
}

// the same requests one by one, a few at a time, when a batch will not start (at twice the batch price); each answer
// is stored as it comes, so a run that stops is taken up again by the next
async function direct(parallel = 4) {
  const { items, requests } = requests_();
  if (!requests.length) return console.log('nothing left to translate');
  console.log(`${items.length} summaries in ${requests.length} requests`);
  const results = readJson(RESULT, {}), usage = { input: 0, output: 0 }, failed = [];
  let next = 0, done = 0;
  const ids = new Set(items.map((s) => s.id));
  async function worker() {
    while (next < requests.length) {
      const r = requests[next++];
      try {
        const msg = await (await api('messages', { method: 'POST', body: JSON.stringify(r.params) })).json();
        usage.input += msg.usage.input_tokens;
        usage.output += msg.usage.output_tokens;
        const text = msg.content.find((b) => b.type === 'text');
        if (msg.stop_reason !== 'end_turn' || !text) throw new Error(msg.stop_reason);
        for (const t of JSON.parse(text.text).translations) if (ids.has(t.id)) results[t.id] = t.en.trim();
        fs.writeFileSync(RESULT, JSON.stringify(results, null, 1));
      } catch (e) {
        failed.push(`${r.custom_id} (${e.message.slice(0, 80)})`);
      }
      console.log(`${++done}/${requests.length}`);
    }
  }
  await Promise.all(Array.from({ length: parallel }, worker));
  const cost = (usage.input * MODEL.input + usage.output * MODEL.output) * 2 / 1e6;
  console.log(`${usage.input} in, ${usage.output} out, $${cost.toFixed(2)}`);
  if (failed.length) console.log(`failed: ${failed.join(', ')}; run direct again to retry`);
  console.log(`${todo().length} still untranslated`);
}

async function cancel() {
  const { id } = readJson(BATCH, {});
  const b = await (await api(`messages/batches/${id}/cancel`, { method: 'POST' })).json();
  console.log(id, b.processing_status);
}

const cmd = process.argv[2];
if (cmd === 'submit') await submit();
else if (cmd === 'direct') await direct();
else if (cmd === 'cancel') await cancel();
else if (cmd === 'collect') await collect();
else if (cmd === 'missing') console.log(`${todo().length} of ${stories().length} untranslated`);
else console.log('usage: node tools/translate.mjs submit|collect|direct|cancel|missing');
