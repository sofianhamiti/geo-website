/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
  readonly SSR: boolean
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
