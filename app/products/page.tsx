import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { syncAmwayCatalog } from '@/lib/actions/sync';
import { toggleProductSyncLock, deleteManualProduct } from '@/lib/actions/products';
import Link from 'next/link';
import { Package, RefreshCw, Plus, Search, Tag, ExternalLink, Lock, Unlock, Trash2, HelpCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Dynamic route

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    brand?: string;
    source?: string;
    active?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams.search || '';
  const brandFilter = resolvedSearchParams.brand || 'all';
  const sourceFilter = resolvedSearchParams.source || 'all';
  const activeFilter = resolvedSearchParams.active || 'active';

  let products: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();
    let query = supabase.from('products').select('*');

    // 1. Text Search matching
    if (searchQuery) {
      query = query.textSearch('search_vector', searchQuery, {
        config: 'simple',
        type: 'websearch'
      });
    }

    // 2. Exact filter matches
    if (brandFilter !== 'all') {
      query = query.eq('brand', brandFilter as 'amway' | 'vera');
    }
    if (sourceFilter !== 'all') {
      query = query.eq('source', sourceFilter as 'amway-price-checker' | 'manual');
    }
    if (activeFilter === 'active') {
      query = query.eq('active', true);
    } else if (activeFilter === 'inactive') {
      query = query.eq('active', false);
    }

    const { data, error } = await query.order('name', { ascending: true });

    if (error) {
      console.error('Products fetch error:', error);
      errorMsg = error.message;
    } else {
      products = data || [];
    }
  } catch (err: any) {
    errorMsg = err.message || 'Authentication error';
  }

  // Server Action to trigger sync
  async function handleSync() {
    'use server';
    await syncAmwayCatalog();
    redirect('/products');
  }

  // Server Action to toggle lock
  async function handleToggleLock(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const isLocked = formData.get('locked') === 'true';
    await toggleProductSyncLock(id, !isLocked);
    redirect('/products');
  }

  // Server Action to delete manual product
  async function handleDeleteProduct(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteManualProduct(id);
    redirect('/products');
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-rose-500" />
            Product Catalog
          </h1>
          <p className="text-sm text-slate-400">
            Browse and sync catalog inventory, manage pricing updates, and configure manual services.
          </p>
        </div>

        {/* Sync & Custom Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <form action={handleSync}>
            <button
              type="submit"
              className="h-10 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md group active:scale-95"
            >
              <RefreshCw className="w-4 h-4 text-rose-400 group-hover:rotate-180 transition-transform duration-500" />
              Sync Amway Catalog
            </button>
          </form>

          <Link
            href="/products/new"
            className="h-10 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-rose-500/10"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </Link>
        </div>
      </section>

      {/* Grid: Filters Panel and Products Catalog List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Sidebar Filters (1 Column) */}
        <aside className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col gap-5">
          <div className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-900/60">
            <Search className="w-4 h-4 text-rose-500" />
            Catalog Filters
          </div>

          {/* Search box */}
          <form method="GET" action="/products" className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search catalog..."
              className="w-full h-10 pl-9 pr-4 text-xs bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600"
            />
          </form>

          {/* Filters by Brand */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Brand Origin
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'All Brands', value: 'all' },
                { label: 'Amway', value: 'amway' },
                { label: 'Vera Custom', value: 'vera' },
              ].map((btn) => (
                <Link
                  key={btn.value}
                  href={`/products?search=${searchQuery}&brand=${btn.value}&source=${sourceFilter}&active=${activeFilter}`}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    brandFilter === btn.value
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                  }`}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Filters by Source */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Listing Source
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'All Sources', value: 'all' },
                { label: 'Synced Catalog', value: 'amway-price-checker' },
                { label: 'Manually Logged', value: 'manual' },
              ].map((btn) => (
                <Link
                  key={btn.value}
                  href={`/products?search=${searchQuery}&brand=${brandFilter}&source=${btn.value}&active=${activeFilter}`}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
                    sourceFilter === btn.value
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                  }`}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Status filters */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Active Inventory
            </span>
            <div className="flex gap-1.5">
              {[
                { label: 'Active', value: 'active' },
                { label: 'Discontinued', value: 'inactive' },
                { label: 'All Items', value: 'all' },
              ].map((btn) => (
                <Link
                  key={btn.value}
                  href={`/products?search=${searchQuery}&brand=${brandFilter}&source=${sourceFilter}&active=${btn.value}`}
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold border transition-all ${
                    activeFilter === btn.value
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-800'
                  }`}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>

        </aside>

        {/* Products Grid (3 Columns) */}
        <section className="lg:col-span-3 flex flex-col gap-6 w-full">
          
          {errorMsg ? (
            <div className="glass-panel border border-rose-950/20 bg-rose-950/5 rounded-2xl p-6 text-sm text-rose-300">
              Failed to connect catalog database: {errorMsg}
            </div>
          ) : products.length === 0 ? (
            <div className="glass-panel border border-slate-900 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Package className="w-12 h-12 text-slate-800 mb-4" />
              <h3 className="text-sm font-semibold text-slate-400 mb-1">No products found</h3>
              <p className="text-xs text-slate-500 max-w-[280px]">
                Try refining your filters, searching another keyword, or trigger the Sync Amway Catalog action.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className={`glass-panel border rounded-3xl p-5 flex flex-col justify-between gap-5 transition-all group ${
                    !prod.active 
                      ? 'border-rose-950/25 opacity-60 hover:opacity-100 bg-rose-950/5' 
                      : 'border-slate-900 hover:border-slate-800'
                  }`}
                >
                  {/* Card Content */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          prod.brand === 'amway'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {prod.brand === 'amway' ? 'Amway Synced' : 'Vera Service'}
                      </span>

                      {!prod.active && (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                          Discontinued
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col">
                      <h3 className="text-sm font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors">
                        {prod.name}
                      </h3>
                      {prod.amway_brand && (
                        <span className="text-[10px] font-semibold text-slate-500 mt-1">
                          {prod.amway_brand}
                        </span>
                      )}
                      {prod.category && (
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mt-1">
                          <Tag className="w-3 h-3 text-rose-400" />
                          {prod.category}
                        </span>
                      )}
                    </div>

                    {prod.description && (
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mt-1">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Pricing and Details bottom */}
                  <div className="border-t border-slate-900/60 pt-4 flex flex-col gap-3.5">
                    
                    {/* Catalog detail specs */}
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-semibold text-slate-500 uppercase">Retail Price</span>
                        <span className="font-bold text-slate-200">
                          {prod.price ? `${prod.price.toFixed(2)} ${prod.currency || 'EUR'}` : 'N/A'}
                        </span>
                      </div>
                      
                      {prod.wholesale_price && (
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[9px] font-semibold text-slate-500 uppercase">Member Price</span>
                          <span className="font-bold text-slate-300">
                            {prod.wholesale_price.toFixed(2)} {prod.currency}
                          </span>
                        </div>
                      )}
                      
                      {prod.pv && (
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[9px] font-semibold text-slate-500 uppercase">PV Value</span>
                          <span className="font-bold text-rose-400">
                            {prod.pv}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick Action controls */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-900/40 pt-3">
                      
                      <div className="flex items-center gap-1">
                        {prod.source === 'amway-price-checker' ? (
                          /* Sync lock switch */
                          <form action={handleToggleLock} className="inline-block">
                            <input type="hidden" name="id" value={prod.id} />
                            <input type="hidden" name="locked" value={prod.sync_locked ? 'true' : 'false'} />
                            <button
                              type="submit"
                              className={`h-7 px-2.5 text-[9px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                                prod.sync_locked
                                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                  : 'bg-slate-950 border border-slate-900 text-slate-500 hover:text-slate-300'
                              }`}
                              title={prod.sync_locked ? 'Sync locked. Overwrites disabled.' : 'Sync active. Scraper updates automatic.'}
                            >
                              {prod.sync_locked ? (
                                <>
                                  <Lock className="w-3 h-3 text-amber-400" />
                                  Sync Locked
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3 text-slate-500" />
                                  Sync Active
                                </>
                              )}
                            </button>
                          </form>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500">
                            Manual product
                          </span>
                        )}

                        {prod.source_url && (
                          <a
                            href={prod.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-7 w-7 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-100 rounded-lg flex items-center justify-center transition-colors"
                            title="Open catalog page"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Manual product Delete option */}
                      {prod.source === 'manual' && (
                        <form action={handleDeleteProduct}>
                          <input type="hidden" name="id" value={prod.id} />
                          <button
                            type="submit"
                            className="p-1.5 bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/20 hover:border-rose-950/50 text-rose-400 hover:text-rose-300 rounded-lg transition-colors"
                            title="Delete manual product"
                            onClick={(e) => {
                              if (!confirm(`Are you sure you want to delete "${prod.name}"?`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}
                      
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

      </div>

    </div>
  );
}
