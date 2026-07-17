const ANALYTICS_OPT_OUT_COOKIE = 'voy_analytics';
const ANALYTICS_OPT_OUT_VALUE = 'off';

function cookieValue(request, name) {
  const cookieHeader = request.headers.get('Cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    return part.slice(separator + 1).trim();
  }
  return '';
}

function hasAnalyticsOptOutCookie(request) {
  return cookieValue(request, ANALYTICS_OPT_OUT_COOKIE) === ANALYTICS_OPT_OUT_VALUE;
}

function requestWithInternalOptOut(request) {
  if (!hasAnalyticsOptOutCookie(request)) return request;
  if (request.headers.get('Sec-GPC') === '1' || request.headers.get('DNT') === '1') return request;

  const headers = new Headers(request.headers);
  headers.set('DNT', '1');
  return new Request(request, { headers });
}

export function createAnalyticsOptOutBoundary(baseWorker) {
  if (!baseWorker || typeof baseWorker.fetch !== 'function') {
    throw new TypeError('baseWorker.fetch is required');
  }

  return {
    ...baseWorker,
    fetch(request, env, ctx) {
      return baseWorker.fetch(requestWithInternalOptOut(request), env, ctx);
    }
  };
}

export const analyticsOptOutContract = Object.freeze({
  cookieName: ANALYTICS_OPT_OUT_COOKIE,
  cookieValue: ANALYTICS_OPT_OUT_VALUE
});
