'use client';

import { useState } from 'react';
import { toggleProductSyncLock } from '@/lib/actions/products';
import { X, Lock, Unlock, ExternalLink, HelpCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type ProductBottomSheetProps = {
  product: {
    id: string;
    name: string;
    brand: 'amway' | 'vera';
    category: string | null;
    numeric_sku: string | null;
    price: number | null;
    wholesale_price: number | null;
    currency: string | null;
    pv: number | null;
    description: string | null;
    source_url: string | null;
    amway_brand: string | null;
    source: 'amway-price-checker' | 'manual';
    active: boolean;
    sync_locked: boolean;
  };
  onClose: () => void;
};

export default function ProductBottomSheet({ product, onClose }: ProductBottomSheetProps) {
  const [syncLocked, setSyncLocked] = useState(product.sync_locked);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggleLock = async () => {
    setLoading(true);
    try {
      const res = await toggleProductSyncLock(product.id, syncLocked);
      if (res.success) {
        setSyncLocked(!syncLocked);
        router.refresh();
      } else {
        console.error('Lock toggle error:', res.error);
      }
    } catch (err) {
      console.error('Failed to toggle sync lock:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center animate-in fade-in duration-300">
      
      {/* Outer Click close gate */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Container Panel */}
      <div className="w-full max-w-lg bg-[#07040d]/95 glass-panel border-t border-slate-800 rounded-t-[2.5rem] shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 flex flex-col gap-6 p-6 md:p-8">
        
        {/* Drag handle decoration */}
        <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto" />

        {/* Close Button Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                product.brand === 'amway'
                  ? 'bg-rose-500/10 text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {product.brand === 'amway' ? 'Amway Catalog' : 'Vera Service'}
            </span>
            {!product.active && (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                Discontinued
              </span>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-900 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Details Section */}
        <div className="flex flex-col gap-4">
          
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-100 leading-snug">
              {product.name}
            </h2>
            {product.amway_brand && (
              <span className="text-xs font-semibold text-slate-500 mt-1">
                {product.amway_brand}
              </span>
            )}
            {product.category && (
              <span className="text-xs text-rose-400 font-semibold mt-1">
                Category: {product.category}
              </span>
            )}
          </div>

          {product.description && (
            <p className="text-xs text-slate-300 leading-relaxed max-h-[160px] overflow-y-auto pr-1">
              {product.description}
            </p>
          )}

          {/* Catalog stats list grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/60 border border-slate-900 rounded-2xl p-4 mt-2">
            
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Retail Price</span>
              <span className="text-sm font-extrabold text-slate-100">
                {product.price ? `${product.price.toFixed(2)} ${product.currency || 'EUR'}` : 'N/A'}
              </span>
            </div>

            {product.wholesale_price && (
              <div className="flex flex-col gap-0.5 text-right">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Member Price</span>
                <span className="text-sm font-extrabold text-slate-200">
                  {product.wholesale_price.toFixed(2)} {product.currency}
                </span>
              </div>
            )}

            {product.pv && (
              <div className="flex flex-col gap-0.5 mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Point Value (PV)</span>
                <span className="text-sm font-extrabold text-rose-400">
                  {product.pv}
                </span>
              </div>
            )}

            {product.numeric_sku && (
              <div className="flex flex-col gap-0.5 text-right mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Catalog SKU</span>
                <span className="text-sm font-extrabold text-slate-300">
                  {product.numeric_sku}
                </span>
              </div>
            )}

          </div>

        </div>

        {/* Action controls panel */}
        <div className="border-t border-slate-900 pt-6 flex flex-col gap-3.5 mt-2">
          
          <div className="flex items-center justify-between gap-4">
            
            {product.source === 'amway-price-checker' ? (
              /* Sync locks controls */
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Sync Lock Override
                </span>
                <p className="text-[10px] text-slate-400 max-w-[200px]">
                  Locking protects manual catalog overrides from getting wiped by scrapers.
                </p>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-500">
                Manual custom inventory item.
              </span>
            )}

            {product.source === 'amway-price-checker' && (
              <button
                onClick={handleToggleLock}
                disabled={loading}
                className={`h-9 px-4 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                  syncLocked
                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/15'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700'
                }`}
              >
                {loading ? (
                  <span className="animate-spin text-slate-400">...</span>
                ) : syncLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Sync Locked
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    Sync Active
                  </>
                )}
              </button>
            )}

          </div>

          {/* Links and checkout hooks */}
          {product.source_url && (
            <a
              href={product.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md mt-2"
            >
              <ShoppingBag className="w-4 h-4 text-rose-500" />
              Open Amway Product Page
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          )}

        </div>

      </div>

    </div>
  );
}
