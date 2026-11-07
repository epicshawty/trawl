import type { TrawlApi } from '@shared/types';

declare global {
  interface Window {
    trawl: TrawlApi;
  }
}

export {};
