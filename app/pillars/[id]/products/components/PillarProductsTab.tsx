'use client';

import { useState } from 'react';
import { connectProductToPillar, disconnectProductFromPillar } from '@/lib/actions/products';
import ProductBottomSheet from './ProductBottomSheet';
import { Package, Search, Plus, Trash2, ArrowUpRight, CheckCircle2, Bookmark, Lock, ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type PillarProductsTabProps = {
  pillarId: string;
  connectedProducts: any[];
  allCatalogProducts: any[];
};

export default function PillarProductsTab({
  pillarId,
  connectedProducts,
  allCatalogProducts,
}: PillarProductsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProductToConnect, setSelectedProductToConnect] = useState<any>(null);
  const [activePreviewProduct, setActivePreviewProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Filter products for the catalog lookup (only active, and not yet connected)
  const connectedProductIds = new Set(connectedProducts.map((p) => p.products?.id));
  const availableProducts = allCatalogProducts.filter(
    (p) => 
      !connectedProductIds.has(p.id) &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductToConnect) return;

    setLoading(true);
    try {
      const res = await connectProductToPillar(pillarId, selectedProductToConnect.id, notes);
      if (res.success) {
        setSelectedProductToConnect(null);
        setNotes('');
        router.refresh();
      } else {
        alert(`Failed to connect product: ${res.error}`);
      }
    } catch (err) {
      console.error('Connection failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (productId: string) => {
    if (!confirm('Are you sure you want to disconnect this product from this content pillar?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await disconnectProductFromPillar(pillarId, productId);
      if (res.success) {
        router.refresh();
      } else {
        alert(`Failed to disconnect: ${res.error}`);
      }
    } catch (err) {
      console.error('Disconnect failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Search & Connect Subpanel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Connection Tool (1 Column) */}
        <div className="glass-panel border border-slate-900 rounded-3xl p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-white">Connect A Product</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search catalog inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-slate-650"
            />
          </div>

          {selectedProductToConnect ? (
            /* Selected Connection Form */
            <form onSubmit={handleConnect} className="flex flex-col gap-3.5 animate-in slide-in-from-top-2 duration-200">
              <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Selected</span>
                  <span className="text-xs font-semibold text-slate-200 line-clamp-1">{selectedProductToConnect.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductToConnect(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-bold"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Relevance Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why is this product relevant to this evergreen pillar strategy?"
                  className="p-3 text-xs bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none placeholder:text-slate-700"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-9 w-full bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-xl flex items-center justify-center shadow-md transition-colors"
              >
                {loading ? 'Connecting...' : 'Connect to Cluster'}
              </button>
            </form>
          ) : (
            /* Results dropdown catalog items */
            <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-900/60 border border-slate-900 rounded-2xl bg-slate-950/40">
              {searchQuery.trim().length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-600">
                  Type to query catalog...
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-600">
                  No matches available.
                </div>
              ) : (
                availableProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductToConnect(p)}
                    className="w-full p-3 text-left text-xs text-slate-300 hover:text-white hover:bg-rose-500/5 transition-colors flex items-center justify-between gap-3 group border-l-2 border-transparent hover:border-rose-500"
                  >
                    <span className="line-clamp-2 font-semibold">{p.name}</span>
                    <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-rose-400 shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}

        </div>

        {/* Connected Products list (2 Columns) */}
        <div className="md:col-span-2 flex flex-col gap-4 w-full">
          {connectedProducts.length === 0 ? (
            <div className="glass-panel border border-slate-900 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[300px]">
              <Package className="w-12 h-12 text-slate-800 mb-4" />
              <h4 className="text-sm font-semibold text-slate-400 mb-1">No products connected</h4>
              <p className="text-xs text-slate-500 max-w-[280px]">
                Search and connect Amway catalog items or Vera services to this evergreen pillar to build relevance graphs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {connectedProducts.map((item) => {
                const prod = item.products;
                if (!prod) return null;

                return (
                  <div
                    key={prod.id}
                    className="glass-panel border border-slate-900 hover:border-slate-800 rounded-3xl p-5 flex flex-col justify-between gap-5 group transition-all"
                  >
                    
                    {/* Upper click area to open details */}
                    <div 
                      className="flex flex-col gap-2.5 cursor-pointer"
                      onClick={() => setActivePreviewProduct(prod)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          {prod.category || 'General'}
                        </span>
                        
                        {prod.brand === 'amway' && prod.sync_locked && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-extrabold flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            LOCKED
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-slate-200 group-hover:text-rose-400 transition-colors line-clamp-2">
                        {prod.name}
                      </h4>

                      {item.notes && (
                        <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3 flex flex-col gap-1 mt-1">
                          <span className="text-[9px] font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                            <Bookmark className="w-2.5 h-2.5" />
                            Relevance Note
                          </span>
                          <p className="text-slate-400 text-[10px] leading-relaxed line-clamp-3 italic">
                            "{item.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Specifications & Actions footer */}
                    <div className="border-t border-slate-900/60 pt-4 flex flex-col gap-3">
                      
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                        <span>Retail Price:</span>
                        <span className="text-slate-200">
                          {prod.price ? `${prod.price.toFixed(2)} ${prod.currency || 'EUR'}` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-slate-900/40 pt-3">
                        <button
                          onClick={() => setActivePreviewProduct(prod)}
                          className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          View Details Specs
                        </button>
                        
                        <button
                          onClick={() => handleDisconnect(prod.id)}
                          disabled={loading}
                          className="p-1.5 bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/20 hover:border-rose-950/50 text-rose-400 hover:text-rose-300 rounded-lg transition-colors"
                          title="Disconnect product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Pop up Bottom Sheet render */}
      {activePreviewProduct && (
        <ProductBottomSheet
          product={activePreviewProduct}
          onClose={() => setActivePreviewProduct(null)}
        />
      )}

    </div>
  );
}
