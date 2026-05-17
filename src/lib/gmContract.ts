import { getAddress, isAddress } from "viem";
import { arcTestnet, hardhatLocal } from "./chains";

export const gmAbi = [
  {
    type: "function",
    name: "sayGM",
    stateMutability: "nonpayable",
    inputs: [{ name: "message", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "totalGms",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "gmCountByAddress",
    stateMutability: "view",
    inputs: [{ name: "sender", type: "address" }],
    outputs: [{ name: "count", type: "uint256" }],
  },
  {
    type: "function",
    name: "getRecentGms",
    stateMutability: "view",
    inputs: [{ name: "limit", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "sender", type: "address" },
          { name: "message", type: "string" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "event",
    name: "GmSent",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "message", type: "string", indexed: false },
      { name: "countForSender", type: "uint256", indexed: true },
      { name: "totalGms", type: "uint256", indexed: false },
      { name: "createdAt", type: "uint256", indexed: false },
    ],
  },
] as const;

export type GmPost = {
  sender: `0x${string}`;
  message: string;
  createdAt: bigint;
};

const contractAddresses: Record<number, `0x${string}` | undefined> = {
  [arcTestnet.id]: normalizeAddress(import.meta.env.VITE_GM_CONTRACT_ADDRESS_ARC),
  [hardhatLocal.id]: normalizeAddress(import.meta.env.VITE_GM_CONTRACT_ADDRESS_LOCAL),
};

export function getGmContractAddress(chainId?: number) {
  if (!chainId) {
    return undefined;
  }

  return contractAddresses[chainId];
}

function normalizeAddress(value?: string) {
  if (!value || !isAddress(value)) {
    return undefined;
  }

  return getAddress(value) as `0x${string}`;
}
