export type ClientConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  allowedEmailDomain: string;
};

declare global {
  interface Window {
    __CONFAB_CONFIG__?: Partial<ClientConfig>;
  }
}

export function readClientConfig(): ClientConfig {
  const cfg = window.__CONFAB_CONFIG__ || {};
  return {
    supabaseUrl: String(cfg.supabaseUrl || ''),
    supabaseAnonKey: String(cfg.supabaseAnonKey || ''),
    allowedEmailDomain: String(cfg.allowedEmailDomain || ''),
  };
}
