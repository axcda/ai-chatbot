// Minimal browser-safe `process` shim to avoid bundling errors from `node:process`.
// Only expose what typical client-side libs probe for.

export const env =
  (typeof window !== 'undefined' && (window as any).__ENV__) ||
  ({} as Record<string, string>);
export const browser = true;
export const cwd = () => '/';
export const nextTick = (cb: (...args: any[]) => void, ...args: any[]) =>
  Promise.resolve().then(() => cb(...args));

const processShim = { env, browser, cwd, nextTick } as const;

export default processShim;
