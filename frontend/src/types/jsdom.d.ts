declare module 'jsdom' {
  export function jsdom(): { defaultView?: { document?: Document } };
}
