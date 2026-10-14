import type { GitGuiApi } from './index'

declare global {
  interface Window {
    api: GitGuiApi
  }
}

export {}
