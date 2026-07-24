import { ethers } from "ethers";

export const provider = new ethers.providers.StaticJsonRpcProvider(
  "https://rpc.stable.xyz",
  {
    chainId: 988,
    name: "stable",
  }
);