/**
 * Query + hash parameters of a redirect URL (Supabase puts tokens in the hash:
 * `exp://…#access_token=…`). Same behaviour as expo-auth-session's internal
 * getQueryParams, which SDK 58 no longer exposes.
 */
export function getQueryParams(url: string): { errorCode: string | null; params: Record<string, string> } {
  const params: Record<string, string> = {};
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt === -1 ? url : url.slice(0, hashAt);
  const hash = hashAt === -1 ? '' : url.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt === -1 ? '' : beforeHash.slice(queryAt + 1);

  const read = (part: string) => {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = decode(eq === -1 ? pair : pair.slice(0, eq));
      const value = eq === -1 ? '' : decode(pair.slice(eq + 1));
      if (key) params[key] = value;
    }
  };
  read(query);
  const errorCode = params.errorCode ?? null;
  delete params.errorCode;
  read(hash); // hash values win, as in the original

  return { errorCode, params };
}

function decode(s: string) {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}
