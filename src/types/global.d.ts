declare const __APP_VERSION__: string;
declare const __APP_GIT_HASH__: string;
declare const __APP_BUILD_TIME__: string;

declare global {
  interface Window {
    __APP_VERSION__?: string;
  }
}

export {};
