"use client";

interface MintCardProps {
  totalSupply: string;
  mintPrice: string;
  isLoading: boolean;
  account: string;
  onConnect: () => void;
  onMint: () => void;
  statusMsg: string;
}

export default function MintCard({
  totalSupply,
  mintPrice,
  isLoading,
  account,
  onConnect,
  onMint,
  statusMsg,
}: MintCardProps) {
  return (
    <div className="w-full max-w-md mx-auto bg-[#0D4A39]/90 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white">
      <div className="relative w-full aspect-square rounded-2xl bg-[#093528] border border-white/10 flex flex-col items-center justify-center group overflow-hidden mb-6 shadow-inner">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/10 via-transparent to-white/5 opacity-60 pointer-events-none"></div>
        
        <img 
          src={`/rocks/${Number(totalSupply) + 1}.png`} 
          alt={`Stable Rocks #${Number(totalSupply) + 1}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />

        <div className="absolute bottom-4 left-4 right-4 text-center bg-black/40 backdrop-blur-md py-1.5 rounded-xl border border-white/10">
          <div className="text-xs tracking-widest text-emerald-300 font-mono font-semibold uppercase">
            Stable Rocks #{Number(totalSupply) + 1}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#093528]/80 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-xs text-slate-300 mb-1">Total Supply</div>
          <div className="text-xl font-bold font-mono text-white">{totalSupply} / 100</div>
        </div>
        <div className="bg-[#093528]/80 border border-white/10 rounded-2xl p-4 text-center">
          <div className="text-xs text-slate-300 mb-1">Mint Price</div>
          <div className="text-xl font-bold font-mono text-emerald-300">{mintPrice} USDT</div>
        </div>
      </div>

      {!account ? (
        <button
          onClick={onConnect}
          className="w-full py-4 rounded-2xl bg-white hover:bg-slate-100 text-[#093528] font-bold transition-all duration-200 shadow-lg cursor-pointer active:scale-[0.98]"
        >
          Connect Wallet to Mint
        </button>
      ) : (
        <button
          onClick={onMint}
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 text-[#093528] font-bold transition-all duration-200 shadow-lg cursor-pointer disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isLoading ? "Processing..." : "Mint"}
        </button>
      )}

      {statusMsg && (
        <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/10 text-xs text-center font-medium text-slate-200">
          {statusMsg}
        </div>
      )}
    </div>
  );
}