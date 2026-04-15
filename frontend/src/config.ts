export type PromptingAttachmentConfig = {
  marker: string;
  labelPrefix: string;
};

export type DocPlusChoiceMap = {
  A: string;
  B: string;
  C: string;
};

export type DocPlusAttribute = {
  name: string;
  choices: DocPlusChoiceMap;
};

export type DocPlusLevel = {
  id: string;
  label: string;
  attributes: DocPlusAttribute[];
};

export type PromptingDocPlusConfig = {
  levels: DocPlusLevel[];
};

export type PromptingConfig = {
  attachments: PromptingAttachmentConfig;
  docPlus: PromptingDocPlusConfig;
};

export type ClientConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  allowedEmailDomain: string;
  prompting: PromptingConfig;
};

declare global {
  interface Window {
    __CONFAB_CONFIG__?: Partial<ClientConfig>;
  }
}

export function readClientConfig(): ClientConfig {
  const cfg = (window.__CONFAB_CONFIG__ || {}) as Partial<ClientConfig>;
  const prompting = cfg.prompting && typeof cfg.prompting === 'object'
    ? cfg.prompting
    : {} as Partial<PromptingConfig>;
  const attachments =
    prompting.attachments && typeof prompting.attachments === 'object'
      ? prompting.attachments
      : {} as Partial<PromptingAttachmentConfig>;
  const docPlus =
    prompting.docPlus && typeof prompting.docPlus === 'object'
      ? prompting.docPlus
      : {} as Partial<PromptingDocPlusConfig>;
  return {
    supabaseUrl: String(cfg.supabaseUrl || ''),
    supabaseAnonKey: String(cfg.supabaseAnonKey || ''),
    allowedEmailDomain: String(cfg.allowedEmailDomain || ''),
    prompting: {
      attachments: {
        marker: String(attachments.marker || ''),
        labelPrefix: String(attachments.labelPrefix || ''),
      },
      docPlus: {
        levels: Array.isArray(docPlus.levels) ? docPlus.levels : [],
      },
    },
  };
}
