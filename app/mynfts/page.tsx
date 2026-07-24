"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Navbar from "@/components/Navbar";

const NFT_ADDRESS = "0xE4E9E37c932B9553a405179c97B02ef3a7F2Ca73";
const MARKETPLACE_ADDRESS = "0xd50E95132f4E2a97A4498D40807f7381B954b690";
const STABLE_CHAIN_RPC = "https://rpc.stable.xyz";

const NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) view returns (address)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)"
];

const MARKETPLACE_ABI = [
  "function listNFT(uint256 tokenId, uint256 price) external",
];

const resolveIPFS = (url: string) => {
  if (!url) return "";
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  return url;
};

interface NFTItem {
  tokenId: number;
  image: string;
  name: string;
}

export default function MyNFTsPage() {
  const [account, setAccount] = useState<string>("");
  const [myNFTs, setMyNFTs] = useState<NFTItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [listPriceInput, setListPriceInput] = useState<string>("");

const getReadProvider = () => {
  return new ethers.providers.StaticJsonRpcProvider(
    STABLE_CHAIN_RPC,
    {
      chainId: 988,
      name: "stable",
    }
  );
};

const getWriteProvider = () => {
  if (!(window as any).ethereum) {
    throw new Error("MetaMask not found");
  }

  return new ethers.providers.Web3Provider(
    (window as any).ethereum
  );
};

  const connectWallet = async () => {
    if (!(window as any).ethereum) return alert("Please install MetaMask!");
    try {
      const provider = getWriteProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyNFTs = async (userAddress: string) => {
    try {
      const provider = getReadProvider();
      const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);

      const balance = (await nftContract.balanceOf(userAddress)).toNumber();
      const items: NFTItem[] = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(userAddress, i);
        const tIdNum = Number(tokenId);
        
        let imageURL = "";
        let nftName = `Stable Rocks #${tIdNum}`;

        try {
          const tokenUri = await nftContract.tokenURI(tIdNum);
          const response = await fetch(resolveIPFS(tokenUri));
          const metadata = await response.json();
          if (metadata.image) imageURL = resolveIPFS(metadata.image);
          if (metadata.name) nftName = metadata.name;
        } catch (e) {}

        items.push({ tokenId: tIdNum, image: imageURL, name: nftName });
      }
      setMyNFTs(items);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if ((window as any).ethereum) {
      ((window as any).ethereum as any).request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchMyNFTs(accounts[0]);
        }
      });
      ((window as any).ethereum as any).on("accountsChanged", (accounts: string[]) => {
        const newAccount = accounts[0] || "";
        setAccount(newAccount);
        if (newAccount) {
          fetchMyNFTs(newAccount); 
        } else {
          setMyNFTs([]);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (account) {
      fetchMyNFTs(account);
    }
  }, [account]);

  const handleListNFT = async (tokenId: number) => {
    if (!listPriceInput || Number(listPriceInput) <= 0) {
      alert("Please enter a valid price!");
      return;
    }
    try {
      setLoading(true);
      const provider = getWriteProvider();
      const signer = provider.getSigner();

      const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, signer);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const currentApproved = await nftContract.getApproved(tokenId);
      const isApprovedAll = await nftContract.isApprovedForAll(account, MARKETPLACE_ADDRESS);

      if (currentApproved.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase() && !isApprovedAll) {
        const approveTx = await nftContract.approve(MARKETPLACE_ADDRESS, tokenId);
        await approveTx.wait();
      }

      const priceWei = ethers.utils.parseUnits(listPriceInput, 6);
      const listTx = await marketplaceContract.listNFT(tokenId, priceWei);
      await listTx.wait();

      alert(`NFT #${tokenId} successfully listed!`);
      setSelectedTokenId(null);
      setListPriceInput("");
      fetchMyNFTs(account);
    } catch (err) {
      console.error(err);
      alert("Failed to list NFT.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1d18] text-white flex flex-col items-center p-6">
      <Navbar account={account} connectWallet={connectWallet} />

      <div className="w-full max-w-2xl">
        <h2 className="text-lg font-bold text-[#00ffcc] mb-4 text-center">My Wallet Collection</h2>
        {!account ? (
          <div className="bg-[#112a23] border border-[#1b4335] rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm mb-4">Please connect your wallet to view your NFTs.</p>
            <button onClick={connectWallet} className="bg-[#00ffcc] text-[#0b1d18] px-6 py-2 rounded-xl text-xs font-bold">
              Connect Wallet
            </button>
          </div>
        ) : myNFTs.length === 0 ? (
          <div className="bg-[#112a23] border border-[#1b4335] rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">No NFTs found in your wallet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {myNFTs.map((nft) => (
              <div key={nft.tokenId} className="bg-[#112a23] border border-[#1b4335] p-4 rounded-xl flex flex-col items-center shadow">
                <div className="w-full h-40 bg-[#081512] rounded-lg overflow-hidden flex items-center justify-center mb-3 border border-[#1b4335]">
                  {nft.image ? (
                    <img src={nft.image} alt={nft.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-500">No Image</span>
                  )}
                </div>
                <p className="text-xs text-gray-300 font-medium mb-3 text-center truncate w-full">{nft.name}</p>
                
                {selectedTokenId === nft.tokenId ? (
                  <div className="w-full flex flex-col gap-2">
                    <input
                      type="number"
                      placeholder="Price in USDT"
                      value={listPriceInput}
                      onChange={(e) => setListPriceInput(e.target.value)}
                      className="bg-[#081512] border border-[#1b4335] text-xs px-2 py-2 rounded text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleListNFT(nft.tokenId)}
                      disabled={loading}
                      className="w-full bg-[#00ffcc] text-[#0b1d18] text-xs font-bold py-2 rounded hover:bg-[#00ddbb] disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Confirm Listing"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedTokenId(nft.tokenId)}
                    className="w-full bg-[#00ffcc]/10 border border-[#00ffcc] text-[#00ffcc] text-xs font-bold py-2 rounded-lg hover:bg-[#00ffcc]/20 transition"
                  >
                    List / Sell
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}