"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  account: string;
  connectWallet: () => void;
}

export default function Navbar({ account, connectWallet }: NavbarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="w-full max-w-4xl flex justify-between items-center mb-8 bg-[#112a23] border border-[#1b4335] px-6 py-4 rounded-2xl shadow-xl">
      <div className="flex items-center gap-6">
        <h1 className="text-base font-bold tracking-wider text-[#00ffcc]">STABLE ROCKS</h1>
        <div className="hidden sm:flex gap-2">
          <Link
            href="/mint"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isActive("/mint") ? "bg-[#00ffcc] text-[#0b1d18]" : "text-gray-300 hover:text-white"
            }`}
          >
            Minting
          </Link>
          <Link
            href="/marketplace"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isActive("/marketplace") ? "bg-[#00ffcc] text-[#0b1d18]" : "text-gray-300 hover:text-white"
            }`}
          >
            Marketplace
          </Link>
          <Link
            href="/mynfts"
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isActive("/mynfts") ? "bg-[#00ffcc] text-[#0b1d18]" : "text-gray-300 hover:text-white"
            }`}
          >
            My NFTs
          </Link>
        </div>
      </div>

      <button
        onClick={connectWallet}
        className="bg-[#00ffcc]/20 border border-[#00ffcc] text-[#00ffcc] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#00ffcc]/30 transition shadow"
      >
        {account ? `${account.substring(0, 6)}...${account.substring(38)}` : "Connect Wallet"}
      </button>
    </nav>
  );
}