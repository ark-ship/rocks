"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Navbar from "@/components/Navbar";

const NFT_ADDRESS = "0xE4E9E37c932B9553a405179c97B02ef3a7F2Ca73";
const MARKETPLACE_ADDRESS = "0xd50E95132f4E2a97A4498D40807f7381B954b690";
const USDT0_ADDRESS = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
const STABLE_CHAIN_RPC = "https://rpc.stable.xyz";

const NFT_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
];

const MARKETPLACE_ABI = [
  "function buyNFT(uint256 tokenId) external",
  "function cancelListing(uint256 tokenId) external",
  "function listings(uint256 tokenId) view returns (address seller, uint256 price, bool active)",
  "event NFTListed(address indexed seller, uint256 indexed tokenId, uint256 price)",
  "event ListingCancelled(address indexed seller, uint256 indexed tokenId)",
  "event NFTSold(address indexed buyer, address indexed seller, uint256 indexed tokenId, uint256 price)"
];

const USDT_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

const resolveIPFS = (url: string) => {
  if (!url) return "";
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  return url;
};

interface ListingItem {
  tokenId: number;
  seller: string;
  price: string;
  image: string;
  name: string;
}

interface ActivityItem {
  id: string;
  type: "LISTED" | "CANCELLED" | "SOLD";
  tokenId: number;
  price?: string;
  user: string;
  timestamp: string;
}

export default function MarketplacePage() {
  const [account, setAccount] = useState<string>("");
  const [marketListings, setMarketListings] = useState<ListingItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Stats
  const [floorPrice, setFloorPrice] = useState<string>("0");
  const [totalVolume, setTotalVolume] = useState<string>("0");
  const [volume24h, setVolume24h] = useState<string>("0");

  const getProvider = () => {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.providers.Web3Provider((window as any).ethereum);
  }
  return new ethers.providers.JsonRpcProvider(STABLE_CHAIN_RPC);
};

  const connectWallet = async () => {
    if (!(window as any).ethereum) return alert("Please install MetaMask!");
    try {
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMarketplaceData = async () => {
    try {
      if (!(window as any).ethereum) return;
      const provider = getProvider();
      const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

      const supply = await nftContract.totalSupply();
      const currentSupply = Number(supply.toString());
      const activeListings: ListingItem[] = [];
      const prices: number[] = [];

      for (let i = 1; i <= currentSupply; i++) {
        try {
          const listing = await marketplaceContract.listings(i);
          if (listing.active) {
            const priceNum = Number(ethers.utils.formatUnits(listing.price, 6));
            prices.push(priceNum);

            let imageURL = "";
            let nftName = `Stable Rocks #${i}`;

            try {
              const tokenUri = await nftContract.tokenURI(i);
              const response = await fetch(resolveIPFS(tokenUri));
              const metadata = await response.json();
              if (metadata.image) imageURL = resolveIPFS(metadata.image);
              if (metadata.name) nftName = metadata.name;
            } catch (e) {}

            activeListings.push({
              tokenId: i,
              seller: listing.seller,
              price: priceNum.toString(),
              image: imageURL,
              name: nftName,
            });
          }
        } catch (err) {}
      }

      setMarketListings(activeListings);

      if (prices.length > 0) {
        setFloorPrice(Math.min(...prices).toString());
      } else {
        setFloorPrice("0");
      }

      await fetchMarketplaceActivity(marketplaceContract, provider);

    } catch (err) {
      console.error(err);
    }
  };

  const fetchMarketplaceActivity = async (marketplaceContract: ethers.Contract, provider: ethers.providers.Provider) => {
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 2000); 

      let listedEvents: any[] = [];
      let cancelledEvents: any[] = [];
      let soldEvents: any[] = [];

      try { listedEvents = await marketplaceContract.queryFilter(marketplaceContract.filters.NFTListed(), fromBlock, "latest"); } catch (e) {}
      try { cancelledEvents = await marketplaceContract.queryFilter(marketplaceContract.filters.ListingCancelled(), fromBlock, "latest"); } catch (e) {}
      try { soldEvents = await marketplaceContract.queryFilter(marketplaceContract.filters.NFTSold(), fromBlock, "latest"); } catch (e) {}

      let calculatedTotalVol = 0;
      let calculated24hVol = 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const rawActivities: ActivityItem[] = [];

      for (const event of soldEvents) {
        try {
          const parsed = marketplaceContract.interface.parseLog(event);
          const tokenId = Number(parsed.args.tokenId.toString());
          const priceStr = ethers.utils.formatUnits(parsed.args.price, 6);
          const priceNum = Number(priceStr);
          const buyer = parsed.args.buyer;

          calculatedTotalVol += priceNum;

          const block = await event.getBlock();
          const blockTime = block.timestamp * 1000;
          if (blockTime >= oneDayAgo) {
            calculated24hVol += priceNum;
          }

          rawActivities.push({
            id: `sold-${event.transactionHash}-${event.logIndex}`,
            type: "SOLD",
            tokenId,
            price: priceStr,
            user: buyer,
            timestamp: new Date(blockTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } catch (err) {}
      }

      for (const event of listedEvents) {
        try {
          const parsed = marketplaceContract.interface.parseLog(event);
          const tokenId = Number(parsed.args.tokenId.toString());
          const priceStr = ethers.utils.formatUnits(parsed.args.price, 6);
          const seller = parsed.args.seller;
          const block = await event.getBlock();

          rawActivities.push({
            id: `listed-${event.transactionHash}-${event.logIndex}`,
            type: "LISTED",
            tokenId,
            price: priceStr,
            user: seller,
            timestamp: new Date(block.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } catch (err) {}
      }

      for (const event of cancelledEvents) {
        try {
          const parsed = marketplaceContract.interface.parseLog(event);
          const tokenId = Number(parsed.args.tokenId.toString());
          const seller = parsed.args.seller;
          const block = await event.getBlock();

          rawActivities.push({
            id: `cancelled-${event.transactionHash}-${event.logIndex}`,
            type: "CANCELLED",
            tokenId,
            user: seller,
            timestamp: new Date(block.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        } catch (err) {}
      }

      setTotalVolume(calculatedTotalVol.toFixed(2));
      setVolume24h(calculated24hVol.toFixed(2));
      setActivities(rawActivities.reverse().slice(0, 10));

    } catch (err) {
      console.error("Failed to load activity logs:", err);
    }
  };

  useEffect(() => {
    fetchMarketplaceData();

    if (typeof window !== "undefined" && (window as any).ethereum) {
      (window as any).ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      });
      ((window as any).ethereum as any).on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || "");
      });
    }
  }, []);

  const handleBuyNFT = async (tokenId: number, priceStr: string) => {
    if (!account) {
      connectWallet();
      return;
    }
    try {
      setLoading(true);
      const provider = getProvider();
      const signer = provider.getSigner();

      const usdtContract = new ethers.Contract(USDT0_ADDRESS, USDT_ABI, signer);
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const priceWei = ethers.utils.parseUnits(priceStr, 6);

      const approveTx = await usdtContract.approve(MARKETPLACE_ADDRESS, priceWei);
      await approveTx.wait();

      const buyTx = await marketplaceContract.buyNFT(tokenId);
      await buyTx.wait();

      alert(`Successfully bought NFT #${tokenId}!`);
      fetchMarketplaceData();
    } catch (err) {
      console.error(err);
      alert("Failed to buy NFT.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (tokenId: number) => {
    if (!account) {
      connectWallet();
      return;
    }
    try {
      setLoading(true);
      const provider = getProvider();
      const signer = provider.getSigner();
      const marketplaceContract = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, signer);

      const tx = await marketplaceContract.cancelListing(tokenId);
      await tx.wait();

      alert(`Successfully cancelled listing for NFT #${tokenId}!`);
      fetchMarketplaceData();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel listing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b1d18] text-white flex flex-col items-center p-6">
      <Navbar account={account} connectWallet={connectWallet} />

      <div className="w-full max-w-4xl">
        {/* STATS HEADER */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#112a23] border border-[#1b4335] p-4 rounded-2xl text-center shadow">
            <p className="text-xs text-gray-400 mb-1">Floor Price</p>
            <p className="text-xl font-extrabold text-[#00ffcc]">{floorPrice} USDT</p>
          </div>
          <div className="bg-[#112a23] border border-[#1b4335] p-4 rounded-2xl text-center shadow">
            <p className="text-xs text-gray-400 mb-1">Total Volume</p>
            <p className="text-xl font-extrabold text-[#00ffcc]">{totalVolume} USDT</p>
          </div>
          <div className="bg-[#112a23] border border-[#1b4335] p-4 rounded-2xl text-center shadow">
            <p className="text-xs text-gray-400 mb-1">24h Volume</p>
            <p className="text-xl font-extrabold text-[#00ffcc]">{volume24h} USDT</p>
          </div>
        </div>

        {/* MAIN LAYOUT: LISTINGS & ACTIVITY FEED */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Marketplace Items Grid */}
          <div className="md:col-span-2">
            <h2 className="text-base font-bold text-[#00ffcc] mb-4">Active Listings</h2>
            {marketListings.length === 0 ? (
              <div className="bg-[#112a23] border border-[#1b4335] rounded-2xl p-10 text-center">
                <p className="text-gray-400 text-sm">No NFTs listed for sale right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {marketListings.map((item) => (
                  <div key={item.tokenId} className="bg-[#112a23] border border-[#1b4335] p-4 rounded-xl flex flex-col items-center shadow">
                    <div className="w-full h-36 bg-[#081512] rounded-lg overflow-hidden flex items-center justify-center mb-3 border border-[#1b4335]">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500">No Image</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 font-medium mb-1 text-center truncate w-full">{item.name}</p>
                    <p className="text-xs text-[#00ffcc] font-bold mb-3">{item.price} USDT</p>

                    {account && account.toLowerCase() === item.seller.toLowerCase() ? (
                      <button
                        onClick={() => handleCancelListing(item.tokenId)}
                        disabled={loading}
                        className="w-full bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-bold py-2 rounded-lg hover:bg-red-500/30 transition disabled:opacity-50"
                      >
                        {loading ? "Processing..." : "Cancel Listing"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyNFT(item.tokenId, item.price)}
                        disabled={loading}
                        className="w-full bg-[#00ffcc] text-[#0b1d18] text-xs font-bold py-2 rounded-lg hover:bg-[#00ddbb] transition disabled:opacity-50"
                      >
                        {loading ? "Processing..." : "Buy NFT"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Feed Sidebar */}
          <div className="bg-[#112a23] border border-[#1b4335] rounded-2xl p-5 shadow h-fit">
            <h2 className="text-base font-bold text-[#00ffcc] mb-4">Marketplace Activity</h2>
            {activities.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">No recent activity recorded.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {activities.map((act) => (
                  <div key={act.id} className="bg-[#081512] border border-[#1b4335] p-3 rounded-xl flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        act.type === "SOLD" ? "bg-green-500/20 text-green-400" :
                        act.type === "LISTED" ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"
                      }`}>
                        {act.type}
                      </span>
                      <span className="text-[10px] text-gray-500">{act.timestamp}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-300">Stable Rocks #{act.tokenId}</p>
                    {act.price && <p className="text-xs text-[#00ffcc] font-semibold">{act.price} USDT</p>}
                    <p className="text-[10px] text-gray-500 truncate">By: {act.user.substring(0, 6)}...{act.user.substring(38)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}