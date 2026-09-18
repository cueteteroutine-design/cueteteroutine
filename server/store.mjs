import { readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const fail = (status, message) => Object.assign(new Error(message), { status });
export const revision = data => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const filePath = () => path.resolve(process.env.DATA_FILE || 'data/store.json');
export const githubEnabled = () => Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY);
let cached;
let queue = Promise.resolve();

async function github(method = 'GET', body) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw fail(503, 'Set GITHUB_REPOSITORY to owner/repository.');
  const file = (process.env.GITHUB_DATA_PATH || 'data/store.json').split('/').map(encodeURIComponent).join('/');
  const branch = process.env.GITHUB_BRANCH || 'main';
  const response = await fetch(`https://api.github.com/repos/${repo}/contents/${file}${method === 'GET' ? `?ref=${encodeURIComponent(branch)}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify({ ...body, branch }) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    if ([409, 422].includes(response.status)) throw fail(409, 'Another edit was saved first. Reload the page and try again.');
    throw fail(503, `GitHub storage unavailable (${response.status}). Check the repository, branch and token permissions.`);
  }
  return response.json();
}

export async function readStore(fresh = false) {
  if (githubEnabled()) {
    if (!fresh && cached && Date.now() - cached.at < 15000) return structuredClone(cached.value);
    const result = await github();
    if (!result.content) throw fail(503, 'JSON data is too large for this storage adapter (1 MB limit).');
    const value = { data: JSON.parse(Buffer.from(result.content, 'base64').toString('utf8')), sha: result.sha };
    cached = { at: Date.now(), value };
    return structuredClone(value);
  }
  return { data: JSON.parse(await readFile(filePath(), 'utf8')), sha: null };
}

export function mutateStore(expectedRevision, transform) {
  const operation = queue.then(async () => {
    if (process.env.VERCEL && !githubEnabled()) throw fail(503, 'Saving requires GITHUB_TOKEN and GITHUB_REPOSITORY in Vercel.');
    const { data, sha } = await readStore(true);
    if (!expectedRevision || expectedRevision !== revision(data)) throw fail(409, 'Data changed since it was loaded. Reload the page before saving.');
    const result = await transform(data);
    data.updated_at = new Date().toISOString();
    const serialized = JSON.stringify(data, null, 2) + '\n';
    if (Buffer.byteLength(serialized) > 900000) throw fail(413, 'JSON storage is approaching its 1 MB limit. Archive old semesters before saving.');
    if (githubEnabled()) {
      const saved = await github('PUT', { message: 'Update ETE routine data [skip ci]', content: Buffer.from(serialized).toString('base64'), sha });
      cached = { at: Date.now(), value: { data, sha: saved.content.sha } };
    } else {
      const temp = `${filePath()}.${randomUUID()}.tmp`;
      await writeFile(temp, serialized, { mode: 0o600 });
      await rename(temp, filePath());
    }
    return { result, revision: revision(data), tables: data.tables, updated_at: data.updated_at };
  });
  queue = operation.catch(() => {});
  return operation;
}
