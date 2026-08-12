export function parseJsonStream(text) {
  const source = String(text || '');
  const records = [];
  let index = 0;
  while (index < source.length) {
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (index >= source.length) break;
    if (source[index] !== '{') throw new Error(`tail_json_stream_unexpected_token:${index}`);
    const start = index;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          records.push(JSON.parse(source.slice(start, index + 1)));
          index += 1;
          break;
        }
      }
    }
    if (depth !== 0) throw new Error('tail_json_stream_truncated');
  }
  return records;
}

function requestPath(record) {
  try { return new URL(record?.event?.request?.url || '').pathname; }
  catch { return ''; }
}

export function isBenignBrowserAssetCancellation(record) {
  const request = record?.event?.request || {};
  const exceptions = Array.isArray(record?.exceptions) ? record.exceptions : [];
  const response = record?.event?.response;
  const userAgent = String(request?.headers?.['user-agent'] || '');
  return record?.outcome === 'canceled'
    && exceptions.length === 0
    && response == null
    && request.method === 'GET'
    && requestPath(record).startsWith('/assets/')
    && userAgent.includes('HeadlessChrome');
}

export function analyzeCandidateTail(text, candidateId) {
  const records = parseJsonStream(text);
  const observedVersionIds = [...new Set(records.map(record => record?.scriptVersion?.id).filter(Boolean))];
  const exact = records.filter(record => record?.scriptVersion?.id === candidateId);
  const benign = exact.filter(isBenignBrowserAssetCancellation);
  const nonOk = exact.filter(record => record?.outcome !== 'ok' && !isBenignBrowserAssetCancellation(record));
  const exceptions = exact.reduce((count, record) => count + (Array.isArray(record?.exceptions) ? record.exceptions.length : 0), 0);
  return {
    exactEvents: exact.length,
    observedVersionIds,
    nonOkOutcomes: nonOk.map(record => record?.outcome || 'unknown'),
    exceptions,
    benignClientCancellations: benign.length,
    benignClientCancellationPaths: [...new Set(benign.map(requestPath))]
  };
}
