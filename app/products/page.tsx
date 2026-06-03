import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { syncAmwayCatalog } from '@/lib/actions/sync';
import { toggleProductSyncLock } from '@/lib/actions/products';
import Link from 'next/link';
import { Package, Plus, Search, Lock, Unlock, ExternalLink } from 'lucide-react';
import SyncButton from './components/SyncButton';
import DeleteManualProductButton from './components/DeleteManualProductButton';
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

  // Server Action to toggle lock
  async function handleToggleLock(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const isLocked = formData.get('locked') === 'true';
    await toggleProductSyncLock(id, !isLocked);
    redirect(`/products?search=${searchQuery}&brand=${brandFilter}&source=${sourceFilter}&active=${activeFilter}`);
  }



  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 font-sans">
      
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-warm pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-display font-serif font-bold text-text-primary flex items-center gap-2.5">
            <Package className="w-6 h-6 text-primary" />
            Product Catalog
          </h1>
          <p className="text-sm text-text-secondary font-sans leading-relaxed">
            Browse and sync catalog inventory, manage pricing updates, and configure manual services.
          </p>
        </div>

        {/* Sync & Custom Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <SyncButton />

          <Link
            href="/products/new"
            className="h-11 px-4 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Create Product
          </Link>
        </div>
      </section>

      {/* Grid: Filters Panel and Products Catalog List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Sidebar Filters (1 Column) */}
        <aside className="bg-surface-mid border border-border-warm rounded-3xl p-6 flex flex-col gap-5 warm-shadow">
          <div className="text-sm font-bold text-text-primary flex items-center gap-2 pb-3 border-b border-border-warm/50 font-serif">
            <Search className="w-4 h-4 text-primary" />
            Catalog Filters
          </div>

          {/* Search box */}
          <form method="GET" action="/products" className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-text-secondary/60" />
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search catalog..."
              className="w-full h-10 pl-9 pr-4 text-xs bg-white border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary placeholder:text-text-secondary/40 font-sans"
            />
            {brandFilter !== 'all' && <input type="hidden" name="brand" value={brandFilter} />}
            {sourceFilter !== 'all' && <input type="hidden" name="source" value={sourceFilter} />}
            {activeFilter !== 'active' && <input type="hidden" name="active" value={activeFilter} />}
          </form>

          {/* Filters by Brand */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-ui-label">
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
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                    brandFilter === btn.value
                      ? 'bg-white border-border-warm text-primary shadow-sm font-extrabold'
                      : 'bg-surface border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-container'
                  }`}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Filters by Source */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-ui-label">
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
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold border transition-all duration-150 ${
                    sourceFilter === btn.value
                      ? 'bg-white border-border-warm text-primary shadow-sm font-extrabold'
                      : 'bg-surface border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-container'
                  }`}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Status filters */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-ui-label">
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
                  className={`flex-1 text-center py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                    activeFilter === btn.value
                      ? 'bg-white border-border-warm text-primary shadow-sm font-extrabold'
                      : 'bg-surface border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-container'
                  }`}
                >
                  {btn.label}
                </Link>
              ))}
            </div>
          </div>

        </aside>

        {/* Products List rows (3 Columns) */}
        <section className="lg:col-span-3 flex flex-col gap-6 w-full">
          
          {errorMsg ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-600">
              Failed to connect catalog database: {errorMsg}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-border-warm rounded-3xl p-12 text-center text-text-secondary flex flex-col items-center justify-center warm-shadow">
              <Package className="w-12 h-12 text-text-secondary/45 mb-4" />
              <h3 className="text-base font-serif font-bold text-text-primary mb-1">No products found</h3>
              <p className="text-xs text-text-secondary max-w-[280px] leading-relaxed">
                Try refining your filters, searching another keyword, or trigger the Sync Amway Catalog action.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Table Header (Desktop Only) */}
              <div className="hidden md:grid grid-cols-12 px-6 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary font-ui-label border-b border-border-warm/50 pb-2">
                <div className="col-span-5">Product Details</div>
                <div className="col-span-3">Brand</div>
                <div className="col-span-2 text-center">PV Value</div>
                <div className="col-span-2 text-right">Status</div>
              </div>

              {/* Rows List */}
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className={`grid grid-cols-12 items-center bg-white border border-border-warm rounded-xl px-4 md:px-6 py-3.5 md:h-[72px] md:py-0 warm-shadow hover:bg-surface-mid transition-all duration-200 active:scale-[0.99] group ${
                    !prod.active 
                      ? 'opacity-65 bg-surface-dim' 
                      : ''
                  }`}
                >
                  {/* Product details (Click to open hubs) */}
                  <Link 
                    href={`/products/${prod.id}`}
                    className="col-span-12 md:col-span-5 flex items-center gap-4 min-w-0"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface border border-border-warm overflow-hidden flex-shrink-0 flex items-center justify-center p-1 bg-white">
                      {prod.image_url ? (
                        <img 
                          src={prod.image_url} 
                          alt={prod.name} 
                          className="w-full h-full object-contain"
                          loading="lazy" 
                        />
                      ) : (
                        <Package className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-ui-label text-sm font-bold text-text-primary truncate group-hover:text-primary transition-colors leading-snug">
                        {prod.name}
                      </span>
                      <span className="text-[10px] text-text-secondary md:hidden mt-0.5">
                        {prod.amway_brand || (prod.brand === 'amway' ? 'Amway' : 'Vera')} • {prod.price ? `${prod.price.toFixed(2)} ${prod.currency || 'EUR'}` : 'N/A'} {prod.pv ? `• PV: ${prod.pv}` : ''}
                      </span>
                    </div>
                  </Link>

                  {/* Brand column (Desktop Only) */}
                  <div className="hidden md:block col-span-3 text-sm text-text-secondary">
                    {prod.amway_brand || (prod.brand === 'amway' ? 'Amway Synced' : 'Vera Custom')}
                  </div>

                  {/* PV column (Desktop Only) */}
                  <div className="hidden md:block col-span-2 text-center font-data-mono text-primary text-sm font-semibold">
                    {prod.pv ? prod.pv : '—'}
                  </div>

                  {/* Status & Action columns */}
                  <div className="col-span-12 md:col-span-2 flex justify-between md:justify-end items-center gap-3 mt-2.5 md:mt-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${prod.active ? (prod.sync_locked ? 'bg-stale-amber' : 'bg-[#3D7A4A]') : 'bg-burgundy'}`}></span>
                      <span className="font-data-mono text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                        {prod.active ? (prod.source === 'amway-price-checker' ? (prod.sync_locked ? 'Locked' : 'Synced') : 'Manual') : 'Off'}
                      </span>
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center gap-1.5">
                      {prod.source === 'amway-price-checker' ? (
                        /* Sync lock switch */
                        <form action={handleToggleLock} className="inline-block">
                          <input type="hidden" name="id" value={prod.id} />
                          <input type="hidden" name="locked" value={prod.sync_locked ? 'true' : 'false'} />
                          <button
                            type="submit"
                            className={`p-1.5 rounded-lg border transition-all duration-200 active:scale-90 ${
                              prod.sync_locked
                                ? 'bg-amber-50 border-amber-200 text-amber-600'
                                : 'bg-surface border-border-warm text-text-secondary hover:text-text-primary hover:border-primary/20'
                            }`}
                            title={prod.sync_locked ? 'Sync locked. Click to unlock.' : 'Sync active. Click to lock.'}
                          >
                            {prod.sync_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                        </form>
                      ) : (
                        /* Manual product Delete option */
                        prod.source === 'manual' && (
                          <DeleteManualProductButton productId={prod.id} productName={prod.name} />
                        )
                      )}

                      {prod.source_url && (
                        <a
                          href={prod.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-surface border border-border-warm hover:border-primary/20 text-text-secondary hover:text-primary rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90"
                          title="Open catalog page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
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
