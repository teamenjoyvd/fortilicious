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
        <div className="bg-white border border-border-warm rounded-3xl p-5 flex flex-col gap-4 warm-shadow">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-text-primary">Connect A Product</h3>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-text-secondary/50" />
            <input
              type="text"
              placeholder="Search catalog inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-secondary/40"
            />
          </div>

          {selectedProductToConnect ? (
            /* Selected Connection Form */
            <form onSubmit={handleConnect} className="flex flex-col gap-3.5 animate-in slide-in-from-top-2 duration-200">
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Selected</span>
                  <span className="text-xs font-semibold text-text-primary line-clamp-1">{selectedProductToConnect.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductToConnect(null)}
                  className="text-text-secondary hover:text-text-primary text-xs font-bold"
                >
                  Clear
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Relevance Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why is this product relevant to this evergreen pillar strategy?"
                  className="p-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary resize-none placeholder:text-text-secondary/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="h-9 w-full bg-primary hover:opacity-95 text-white text-[11px] font-bold rounded-xl flex items-center justify-center shadow-md transition-colors disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect to Cluster'}
              </button>
            </form>
          ) : (
            /* Results dropdown catalog items */
            <div className="max-h-[220px] overflow-y-auto divide-y divide-border-warm border border-border-warm rounded-2xl bg-surface-container-low">
              {searchQuery.trim().length === 0 ? (
                <div className="p-6 text-center text-xs text-text-secondary/50">
                  Type to query catalog...
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-text-secondary/50">
                  No matches available.
                </div>
              ) : (
                availableProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductToConnect(p)}
                    className="w-full p-3 text-left text-xs text-text-secondary hover:text-text-primary hover:bg-surface-container-high transition-colors flex items-center justify-between gap-3 group border-l-2 border-transparent hover:border-primary"
                  >
                    <span className="line-clamp-2 font-semibold">{p.name}</span>
                    <Plus className="w-3.5 h-3.5 text-text-secondary group-hover:text-primary shrink-0" />
                  </button>
                ))
              )}
            </div>
          )}

        </div>

        {/* Connected Products list (2 Columns) */}
        <div className="md:col-span-2 flex flex-col gap-4 w-full">
          {connectedProducts.length === 0 ? (
            <div className="glass-panel border border-border-warm rounded-3xl p-12 text-center text-text-secondary flex flex-col items-center justify-center min-h-[300px] bg-white">
              <Package className="w-12 h-12 text-text-secondary/40 mb-4" />
              <h4 className="text-sm font-semibold text-text-primary mb-1">No products connected</h4>
              <p className="text-xs text-text-secondary max-w-[280px]">
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
                    className="bg-white border border-border-warm hover:border-primary/30 rounded-3xl p-5 flex flex-col justify-between gap-5 group transition-all warm-shadow"
                  >
                    
                    {/* Upper click area to open details */}
                    <div 
                      className="flex flex-col gap-2.5 cursor-pointer"
                      onClick={() => setActivePreviewProduct(prod)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest">
                          {prod.category || 'General'}
                        </span>
                        
                        {prod.brand === 'amway' && prod.sync_locked && (
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-extrabold flex items-center gap-0.5 border border-primary/20">
                            <Lock className="w-2.5 h-2.5" />
                            LOCKED
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-serif font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-2">
                        {prod.name}
                      </h4>

                      {item.notes && (
                        <div className="bg-surface-container-low border border-border-warm rounded-xl p-3 flex flex-col gap-1 mt-1">
                          <span className="text-[9px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1">
                            <Bookmark className="w-2.5 h-2.5" />
                            Relevance Note
                          </span>
                          <p className="text-text-secondary text-[10px] leading-relaxed line-clamp-3 italic">
                            "{item.notes}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Specifications & Actions footer */}
                    <div className="border-t border-border-warm/60 pt-4 flex flex-col gap-3">
                      
                      <div className="flex items-center justify-between text-xs font-semibold text-text-secondary">
                        <span>Retail Price:</span>
                        <span className="text-text-primary font-mono font-bold">
                          {prod.price ? `${prod.price.toFixed(2)} ${prod.currency || 'EUR'}` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-border-warm/45 pt-3">
                        <button
                          onClick={() => setActivePreviewProduct(prod)}
                          className="text-[10px] font-bold text-primary hover:underline transition-colors"
                        >
                          View Details Specs
                        </button>
                        
                        <button
                          onClick={() => handleDisconnect(prod.id)}
                          disabled={loading}
                          className="p-1.5 bg-burgundy/10 hover:bg-burgundy/20 border border-burgundy/20 text-burgundy rounded-lg transition-colors"
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
