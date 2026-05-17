import { createPublicClient, http } from "viem";
import { arcTestnet, defaultChainId, hardhatLocal, supportedChains } from "./chains";

const arcClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
});

const hardhatClient = createPublicClient({
  chain: hardhatLocal,
  transport: http(),
});

export function getPublicClient(chainId = defaultChainId) {
  return chainId === hardhatLocal.id ? hardhatClient : arcClient;
}

export function getSupportedChain(chainId = defaultChainId) {
  return supportedChains.find((chain) => chain.id === chainId) ?? arcTestnet;
}
