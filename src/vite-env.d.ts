/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_CHAIN_ID?: string;
  readonly VITE_GM_CONTRACT_ADDRESS_ARC?: string;
  readonly VITE_GM_CONTRACT_ADDRESS_LOCAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type EthereumRequestArgs = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type EthereumProvider = {
  request: (args: EthereumRequestArgs) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

interface Window {
  ethereum?: EthereumProvider;
}
