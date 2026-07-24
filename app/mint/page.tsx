"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Navbar from "@/components/Navbar";

const NFT_ADDRESS = "0xE4E9E37c932B9553a405179c97B02ef3a7F2Ca73";
const USDT0_ADDRESS = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
const STABLE_CHAIN_RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.stable.xyz";

const NFT_ABI = [
  "function mintItem(address recipient, uint256 quantity) public returns (uint256[] memory)",
  "function mintPrice() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
];

const USDT_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

export default function MintPage() {
  const [account, setAccount] = useState<string>("");
  const [mintPrice, setMintPrice] = useState<string>("2");
  const [totalSupply, setTotalSupply] = useState<string>("0 / 100");
  const [rawSupplyNumber, setRawSupplyNumber] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);

  const getProvider = () => {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.providers.Web3Provider((window as any).ethereum);
  }

  return new ethers.providers.StaticJsonRpcProvider(
    STABLE_CHAIN_RPC,
    {
      chainId: 988,
      name: "stable",
    }
  );
};

  const connectWallet = async () => {
    if (!(window as any).ethereum) return alert("Please install MetaMask!");
    try {
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMintData = async () => {
  try {
    const provider = new ethers.providers.StaticJsonRpcProvider(
      STABLE_CHAIN_RPC,
      {
        chainId: 988,
        name: "stable",
      }
    );

    await provider.ready;

    const nftContract = new ethers.Contract(
      NFT_ADDRESS,
      NFT_ABI,
      provider
    );

    const [price, supply, max] = await Promise.all([
      nftContract.mintPrice(),
      nftContract.totalSupply(),
      nftContract.maxSupply(),
    ]);

    setMintPrice(ethers.utils.formatUnits(price, 6));
    setRawSupplyNumber(supply.toNumber());
    setTotalSupply(`${supply.toString()} / ${max.toString()}`);
  } catch (err) {
    console.error(err);
  }
};

  useEffect(() => {
    fetchMintData();

    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      });

      ((window as any).ethereum as any).on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || "");
        fetchMintData();
      });
    }
  }, []);

  const handleMint = async () => {
    if (!account) {
      connectWallet();
      return;
    }
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider((window as any).ethereum);
      const signer = provider.getSigner();

      const usdtContract = new ethers.Contract(USDT0_ADDRESS, USDT_ABI, signer);
      
      const unitPriceWei = ethers.utils.parseUnits(mintPrice, 6);
      const totalCostWei = unitPriceWei.mul(quantity);

      const balance = await usdtContract.balanceOf(account);
      if (balance.lt(totalCostWei)) {
        alert("Insufficient USDT0 balance!");
        setLoading(false);
        return;
      }

      const approveTx = await usdtContract.approve(NFT_ADDRESS, totalCostWei);
      await approveTx.wait();

      const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
      const mintTx = await nftContract.mintItem(account, quantity);
      await mintTx.wait();

      alert(`Successfully minted ${quantity} Stable Rock(s)!`);
      fetchMintData();
    } catch (err) {
      console.error(err);
      alert("Minting failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const nextTokenId = rawSupplyNumber + 1;
  const previewImagePath = `/rocks/${nextTokenId}.png`;

  return (
    <main className="min-h-screen bg-[#0b1d18] text-white flex flex-col items-center p-6">
      <Navbar account={account} connectWallet={connectWallet} />

      <div className="w-full max-w-md bg-[#112a23] border border-[#1b4335] rounded-2xl p-6 shadow-xl flex flex-col items-center">
        <div className="w-full h-64 bg-[#081512] rounded-xl border border-[#1b4335] flex items-center justify-center mb-6 overflow-hidden relative">
          <img 
            src={previewImagePath} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
          <div className="absolute bottom-2 bg-black/60 px-3 py-1 rounded text-xs text-[#00ffcc] font-medium">
            Preview #{nextTokenId}
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#081512] border border-[#1b4335] p-4 rounded-xl text-center">
            <p className="text-xs text-gray-400 mb-1">Total Supply</p>
            <p className="text-lg font-bold text-[#00ffcc]">{totalSupply}</p>
          </div>
          <div className="bg-[#081512] border border-[#1b4335] p-4 rounded-xl text-center">
            <p className="text-xs text-gray-400 mb-1">Mint Price</p>
            <p className="text-lg font-bold text-[#00ffcc]">{mintPrice} USDT</p>
          </div>
        </div>

        <div className="w-full flex items-center justify-between bg-[#081512] border border-[#1b4335] px-4 py-3 rounded-xl mb-6">
          <span className="text-xs text-gray-400">Quantity</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-7 h-7 bg-[#112a23] border border-[#1b4335] rounded-lg text-sm font-bold hover:bg-[#1b4335]"
            >
              -
            </button>
            <span className="text-sm font-bold text-[#00ffcc]">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="w-7 h-7 bg-[#112a23] border border-[#1b4335] rounded-lg text-sm font-bold hover:bg-[#1b4335]"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleMint}
          disabled={loading}
          className="w-full bg-[#00ffcc] text-[#0b1d18] font-bold py-3 rounded-xl hover:bg-[#00ddbb] transition shadow-lg disabled:opacity-50"
        >
          {loading ? "Processing..." : `Mint ${quantity} Stable Rock`}
        </button>
      </div>
    </main>
  );
}