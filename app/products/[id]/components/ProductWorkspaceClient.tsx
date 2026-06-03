'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ChevronLeft, 
  Brain, 
  Megaphone, 
  Coins, 
  Lock, 
  Unlock, 
  Globe, 
  Plus, 
  Search, 
  FileText, 
  Check, 
  Trash2, 
  Edit3, 
  Loader2, 
  Tag, 
  ExternalLink, 
  X,
  AlertTriangle,
  RefreshCw,
  Columns
} from 'lucide-react';

import { 
  fetchProductInternetFacts, 
  approveProductFact, 
  createManualFact, 
  updateProductFact, 
  deleteProductFact 
} from '@/lib/actions/facts';
import { toggleProductSyncLock } from '@/lib/actions/products';

interface ProductWorkspaceClientProps {
  product: any;
  initialFacts: any[];
  pillars: any[];
  contentPieces: any[];
  initialTab: string;
}

const getCategoryBadgeStyle = (category: string) => {
  switch (category) {
    case 'benefit':
      return { classes: 'bg-[#EBF2EC] text-[#2B5730] border-[#C2D8C6]' };
    case 'science':
      return { classes: 'bg-[#F0F6F7] text-[#2D6E7E] border-[#CEE4E7]' };
    case 'usage':
      return { classes: 'bg-[#F7F8F0] text-[#7A8A3A] border-[#E5E9D0]' };
    case 'fun_fact':
      return { classes: 'bg-[#FDF2F0] text-[#A85040] border-[#F5D5D0]' };
    case 'general':
    default:
      return { classes: 'bg-[#FAF0F0] text-[#8C3A3A] border-[#EED0D0]' };
  }
};

export default function ProductWorkspaceClient({
  product,
  initialFacts,
  pillars,
  contentPieces,
  initialTab
}: ProductWorkspaceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isScraping, setIsScraping] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const [syncLocked, setSyncLocked] = useState(product.sync_locked);

  // Manual Fact Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFact, setNewFact] = useState({
    title: '',
    body: '',
    category: 'general' as 'benefit' | 'science' | 'usage' | 'fun_fact' | 'general',
    sourceTitle: '',
    sourceUrl: ''
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Fact Edit State
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    body: '',
    category: 'general' as 'benefit' | 'science' | 'usage' | 'fun_fact' | 'general',
    source_title: '',
    source_url: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Curation Action States
  const [pendingCurationId, setPendingCurationId] = useState<string | null>(null);

  // Filter facts
  const approvedFacts = initialFacts.filter(f => f.approved);
  const suggestedFacts = initialFacts.filter(f => !f.approved);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(`/products/${product.id}?tab=${tab}`, { scroll: false });
  };

  const handleToggleLock = async () => {
    setIsTogglingLock(true);
    try {
      const res = await toggleProductSyncLock(product.id, !syncLocked);
      if (res.success) {
        setSyncLocked(!syncLocked);
        router.refresh();
      } else {
        alert(`Failed to update lock: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error toggling sync lock: ${err.message}`);
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleScrape = async () => {
    setIsScraping(true);
    try {
      const res = await fetchProductInternetFacts(product.id);
      if (res.success) {
        alert(`Enrichment complete! Scraped internet facts: ${res.count || 0}`);
        router.refresh();
      } else {
        alert(`Scrape Failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Scrape Exception: ${err.message}`);
    } finally {
      setIsScraping(false);
    }
  };

  const handleApproveFact = async (factId: string) => {
    setPendingCurationId(factId);
    try {
      const res = await approveProductFact(factId);
      if (res.success) {
        router.refresh();
      } else {
        alert(`Failed to approve: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error approving fact: ${err.message}`);
    } finally {
      setPendingCurationId(null);
    }
  };

  const handleDeleteFact = async (factId: string, isApproved: boolean) => {
    if (!confirm(`Are you sure you want to dismiss/delete this ${isApproved ? 'fact' : 'suggestion'}?`)) {
      return;
    }
    setPendingCurationId(factId);
    try {
      const res = await deleteProductFact(factId);
      if (res.success) {
        router.refresh();
      } else {
        alert(`Failed to delete: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error deleting fact: ${err.message}`);
    } finally {
      setPendingCurationId(null);
    }
  };

  const handleStartEdit = (fact: any) => {
    setEditingFactId(fact.id);
    setEditForm({
      title: fact.title,
      body: fact.body,
      category: fact.category,
      source_title: fact.source_title || '',
      source_url: fact.source_url || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactId) return;
    setIsSavingEdit(true);
    try {
      const res = await updateProductFact(editingFactId, editForm);
      if (res.success) {
        setEditingFactId(null);
        router.refresh();
      } else {
        alert(`Failed to update: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error updating fact: ${err.message}`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddManualFact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    try {
      const res = await createManualFact(
        product.id,
        newFact.category,
        newFact.title,
        newFact.body,
        newFact.sourceTitle,
        newFact.sourceUrl
      );
      if (res.success) {
        setNewFact({
          title: '',
          body: '',
          category: 'general',
          sourceTitle: '',
          sourceUrl: ''
        });
        setShowAddForm(false);
        router.refresh();
      } else {
        alert(`Failed to save manual fact: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Error adding manual fact: ${err.message}`);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 pb-24 md:pb-8">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2">
        <Link
          href="/products"
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </nav>

      {/* Header Container */}
      <section className="bg-white border border-border-warm rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden warm-shadow">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          {product.image_url ? (
            <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden flex items-center justify-center p-1.5 border border-border-warm shrink-0">
              <img 
                src={product.image_url} 
                alt={product.name} 
                className="max-w-full max-h-full object-contain"
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Brain className="w-8 h-8" />
            </div>
          )}
          
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                product.brand === 'amway' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-[#EBF2EC] text-[#2B5730] border-[#C2D8C6]'
              }`}>
                {product.brand === 'amway' ? 'Amway Synced' : 'Vera Custom'}
              </span>
              {!product.active && (
                <span className="px-2 py-0.5 rounded bg-white border border-border-warm text-burgundy text-[10px] font-bold uppercase tracking-wider">
                  Discontinued
                </span>
              )}
            </div>
            
            <h1 className="text-xl md:text-2xl font-serif font-bold text-text-primary tracking-tight leading-snug">
              {product.name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-secondary text-xs font-semibold mt-0.5">
              {product.category && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  {product.category}
                </span>
              )}
              {product.numeric_sku && (
                <span>SKU: {product.numeric_sku}</span>
              )}
            </div>
          </div>
        </div>

        {/* Global Product Actions */}
        <div className="flex items-center gap-2.5 self-start md:self-center z-10">
          {product.source === 'amway-price-checker' && (
            <button
              onClick={handleToggleLock}
              disabled={isTogglingLock}
              className={`h-10 px-3.5 text-xs font-bold rounded-xl flex items-center gap-2 border transition-all duration-200 active:scale-95 ${
                syncLocked 
                  ? 'bg-primary/10 border-primary/20 text-primary font-extrabold shadow-sm'
                  : 'bg-white border-border-warm text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
              }`}
            >
              {isTogglingLock ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : syncLocked ? (
                <Lock className="w-4 h-4 text-primary" />
              ) : (
                <Unlock className="w-4 h-4 text-text-secondary" />
              )}
              {syncLocked ? 'Sync Locked' : 'Lock Sync'}
            </button>
          )}

          <button
            onClick={handleScrape}
            disabled={isScraping}
            className="h-10 px-4 bg-primary text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isScraping ? (
              <>
                <Loader2 className="w-4 h-4 text-white animate-spin" />
                Scraping Internet...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-white" />
                Search Internet Facts
              </>
            )}
          </button>
        </div>
      </section>

      {/* Tabs Switcher Grid */}
      <nav className="flex gap-6 border-b border-border-warm pb-px -mb-px">
        {[
          { id: 'brain', label: 'Knowledge Brain', icon: Brain },
          { id: 'campaigns', label: 'Campaigns & Posts', icon: Megaphone },
          { id: 'pricing', label: 'Pricing & Inventory', icon: Coins }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`pb-3 pt-1 text-xs font-bold flex items-center gap-2 border-b-2 transition-all duration-150 font-ui-label ${
                isActive 
                  ? 'border-primary text-primary font-extrabold'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-text-secondary'}`} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Tab Panels */}
      <section className="w-full">
        
        {/* Tab 1: Knowledge Brain */}
        {activeTab === 'brain' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            
            {/* Left: Official Specifications */}
            <div className="lg:col-span-2 flex flex-col gap-6 w-full">
              <div className="glass-panel border border-border-warm rounded-3xl p-6 flex flex-col gap-4 bg-white">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border-warm">
                  Official Details
                </div>
                
                {product.amway_brand && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Sub-brand</span>
                    <span className="text-xs font-bold text-text-primary">{product.amway_brand}</span>
                  </div>
                )}

                {product.description ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Product Description</span>
                    <p className="text-xs text-text-primary leading-relaxed font-medium bg-surface-container-low p-3.5 border border-border-warm rounded-2xl">
                      {product.description}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-text-secondary italic">No description details configured.</div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Source Listing</span>
                    <span className="text-xs font-bold text-text-primary capitalize">{product.source.replace(/-/g, ' ')}</span>
                  </div>
                  {product.last_synced_at && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-text-secondary uppercase font-semibold">Last Synced</span>
                      <span className="text-xs font-bold text-text-primary" suppressHydrationWarning>
                        {new Date(product.last_synced_at).toLocaleDateString('en-US')}
                      </span>
                    </div>
                  )}
                </div>

                {product.source_url && (
                  <a
                    href={product.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-10 mt-2 bg-white border border-border-warm hover:bg-surface-container-low text-text-primary text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    Open Catalog Web Page
                  </a>
                )}
              </div>
            </div>

            {/* Right: Knowledge Brain Curation */}
            <div className="lg:col-span-3 flex flex-col gap-6 w-full">
              
              {/* Header with add button */}
              <div className="flex items-center justify-between gap-4 pb-2 border-b border-border-warm">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-bold text-text-primary">Fact Curation</h2>
                </div>
                
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="h-8 px-3 bg-white border border-border-warm hover:bg-surface-container-low text-text-primary text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  {showAddForm ? <X className="w-3.5 h-3.5 text-text-secondary" /> : <Plus className="w-3.5 h-3.5 text-primary" />}
                  {showAddForm ? 'Cancel' : 'Add Manual Fact'}
                </button>
              </div>

              {/* Add Manual Fact Form */}
              {showAddForm && (
                <div className="glass-panel border border-border-warm rounded-3xl p-5 md:p-6 shadow-md animate-in slide-in-from-top-4 duration-200 bg-white">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 pb-2 border-b border-border-warm flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    Add Manual Knowledge Card
                  </h3>
                  <form onSubmit={handleAddManualFact} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Title/Fact Tag</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rich in PhytoNutrition"
                          value={newFact.title}
                          onChange={(e) => setNewFact({ ...newFact, title: e.target.value })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-secondary/40"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Category</label>
                        <select
                          value={newFact.category}
                          onChange={(e) => setNewFact({ ...newFact, category: e.target.value as any })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="benefit">Health Benefit</option>
                          <option value="science">Scientific Detail</option>
                          <option value="usage">Usage / Application</option>
                          <option value="fun_fact">Fun Fact / Story</option>
                          <option value="general">General Insight</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">Fact Body</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Detail the nutritional study, benefits statement, dosage rules, or science facts."
                        value={newFact.body}
                        onChange={(e) => setNewFact({ ...newFact, body: e.target.value })}
                        className="p-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-secondary/40 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Source Title (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. PubMed National Health Study"
                          value={newFact.sourceTitle}
                          onChange={(e) => setNewFact({ ...newFact, sourceTitle: e.target.value })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-secondary/40"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Source URL (Optional)</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={newFact.sourceUrl}
                          onChange={(e) => setNewFact({ ...newFact, sourceUrl: e.target.value })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-text-secondary/40"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingManual}
                      className="h-10 mt-2 bg-primary hover:opacity-90 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                    >
                      {isSubmittingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      Approve & Log Fact
                    </button>
                  </form>
                </div>
              )}

              {/* Inline Fact Editor */}
              {editingFactId && (
                <div className="glass-panel border border-border-warm rounded-3xl p-5 md:p-6 shadow-md animate-in slide-in-from-top-4 duration-200 bg-white">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-4 pb-2 border-b border-border-warm flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                    Edit Knowledge Fact Card
                  </h3>
                  <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Title/Fact Tag</label>
                        <input
                          type="text"
                          required
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Category</label>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="benefit">Health Benefit</option>
                          <option value="science">Scientific Detail</option>
                          <option value="usage">Usage / Application</option>
                          <option value="fun_fact">Fun Fact / Story</option>
                          <option value="general">General Insight</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-secondary uppercase">Fact Body</label>
                      <textarea
                        required
                        rows={3}
                        value={editForm.body}
                        onChange={(e) => setEditForm({ ...editForm, body: e.target.value })}
                        className="p-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Source Title (Optional)</label>
                        <input
                          type="text"
                          value={editForm.source_title}
                          onChange={(e) => setEditForm({ ...editForm, source_title: e.target.value })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-text-secondary uppercase">Source URL (Optional)</label>
                        <input
                          type="url"
                          value={editForm.source_url}
                          onChange={(e) => setEditForm({ ...editForm, source_url: e.target.value })}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingFactId(null)}
                        className="h-9 px-4 bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:bg-surface-container-low text-xs font-bold rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="h-9 px-4 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-60"
                      >
                        {isSavingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Save Fact
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Suggested Insights Queue (Curation Needed) */}
              {suggestedFacts.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5 pb-2 border-b border-border-warm">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    Suggested Insights Queue ({suggestedFacts.length})
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {suggestedFacts.map(fact => {
                      const badgeStyle = getCategoryBadgeStyle(fact.category);
                      return (
                        <div 
                          key={fact.id} 
                          className={`bg-white border border-dashed border-primary/30 rounded-2xl p-4 flex flex-col gap-3.5 transition-all ${
                            pendingCurationId === fact.id ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${badgeStyle.classes}`}>
                                  {fact.category}
                                </span>
                                {fact.source_title && (
                                  <span className="text-[10px] text-text-secondary font-semibold flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-text-secondary" />
                                    {fact.source_title}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-text-primary mt-1">{fact.title}</h4>
                            </div>

                            {/* Quick Curation Approvals */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApproveFact(fact.id)}
                                className="p-1.5 bg-sage/10 border border-sage/20 text-sage hover:bg-sage/20 rounded-lg transition-all"
                                title="Approve Insight"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFact(fact.id, false)}
                                className="p-1.5 bg-burgundy/10 border border-burgundy/20 text-burgundy hover:bg-burgundy/20 rounded-lg transition-all"
                                title="Dismiss Insight"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-text-secondary leading-relaxed italic pr-4 border-l-2 border-primary/20 pl-2.5">
                            "{fact.body}"
                          </p>

                          {fact.source_url && (
                            <a
                              href={fact.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-text-secondary hover:text-text-primary flex items-center gap-0.5 self-start group transition-colors"
                            >
                              Source Link
                              <ExternalLink className="w-2.5 h-2.5 text-text-secondary group-hover:text-text-primary" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Approved Brain Database cards */}
              <div className="flex flex-col gap-4">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-2 border-b border-border-warm">
                  Approved Fact Cards ({approvedFacts.length})
                </div>

                {approvedFacts.length === 0 ? (
                  <div className="glass-panel border border-border-warm rounded-3xl p-10 text-center text-text-secondary flex flex-col items-center justify-center bg-white">
                    <Brain className="w-10 h-10 text-text-secondary/40 mb-3" />
                    <h4 className="text-xs font-semibold text-text-primary mb-1">No approved facts yet</h4>
                    <p className="text-[10px] text-text-secondary max-w-[240px]">
                      Search internet insights or log manual facts to start curating this product's knowledge brain.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {approvedFacts.map(fact => {
                      const badgeStyle = getCategoryBadgeStyle(fact.category);
                      return (
                        <div 
                          key={fact.id} 
                          className={`bg-white border border-border-warm rounded-2xl p-4 flex flex-col gap-3 transition-all hover:border-primary/30 hover:shadow-sm ${
                            pendingCurationId === fact.id ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${badgeStyle.classes}`}>
                                  {fact.category}
                                </span>
                                {fact.source_type === 'manual_entry' ? (
                                  <span className="text-[8px] font-bold uppercase tracking-wider bg-surface-container border border-border-warm text-text-secondary px-2 py-0.5 rounded">
                                    Manual Note
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-bold uppercase tracking-wider bg-sage/10 text-sage border border-sage/20 px-2 py-0.5 rounded">
                                    Scraped Insight
                                  </span>
                                )}
                                {fact.source_title && (
                                  <span className="text-[10px] text-text-secondary font-semibold flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-text-secondary" />
                                    {fact.source_title}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-text-primary mt-1">{fact.title}</h4>
                            </div>

                            {/* Fact Actions */}
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStartEdit(fact)}
                                className="p-1.5 bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:border-primary/45 rounded-lg transition-all"
                                title="Edit Fact"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteFact(fact.id, true)}
                                className="p-1.5 bg-burgundy/10 border border-burgundy/20 text-burgundy hover:bg-burgundy/20 rounded-lg transition-all"
                                title="Delete Fact"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-text-primary leading-relaxed">
                            {fact.body}
                          </p>

                          {fact.source_url && (
                            <a
                              href={fact.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-text-secondary hover:text-text-primary flex items-center gap-0.5 self-start group transition-colors"
                            >
                              Source Link
                              <ExternalLink className="w-2.5 h-2.5 text-text-secondary group-hover:text-text-primary" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Campaigns & Posts */}
        {activeTab === 'campaigns' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* Associated Campaigns (Content Pillars) */}
            <div className="flex flex-col gap-4 w-full">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-2 border-b border-border-warm flex items-center gap-2">
                <Columns className="w-4 h-4 text-primary" />
                Linked Content Pillars ({pillars.length})
              </div>

              {pillars.length === 0 ? (
                <div className="glass-panel border border-border-warm rounded-3xl p-10 text-center text-text-secondary flex flex-col items-center justify-center bg-white">
                  <Columns className="w-10 h-10 text-text-secondary/40 mb-3" />
                  <h4 className="text-xs font-semibold text-text-primary mb-1">No connected pillars</h4>
                  <p className="text-[10px] text-text-secondary max-w-[240px]">
                    This product is not linked to any content pillars. Link it inside the Pillar Products tab.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {pillars.map((pillar: any) => (
                    <div 
                      key={pillar.id}
                      className="bg-white border border-border-warm hover:border-primary/30 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col">
                          <Link href={`/pillars/${pillar.id}`} className="hover:text-primary transition-colors">
                            <h3 className="text-sm font-bold text-text-primary">{pillar.title}</h3>
                          </Link>
                          {pillar.description && (
                            <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-normal">
                              {pillar.description}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                          pillar.status === 'active' 
                            ? 'bg-sage/10 text-sage border-sage/20' 
                            : 'bg-surface-container border border-border-warm text-text-secondary'
                        }`}>
                          {pillar.status}
                        </span>
                      </div>

                      {pillar.connection_notes && (
                        <div className="text-[11px] leading-relaxed text-text-primary bg-surface-container-low p-2.5 border border-border-warm rounded-xl">
                          <span className="font-bold text-text-secondary block text-[9px] uppercase tracking-wider mb-0.5">Connection Notes</span>
                          "{pillar.connection_notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Associated Content Pieces (Posts) */}
            <div className="flex flex-col gap-4 w-full">
              <div className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-2 border-b border-border-warm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Associated Posts / Content Pieces ({contentPieces.length})
              </div>

              {contentPieces.length === 0 ? (
                <div className="glass-panel border border-border-warm rounded-3xl p-10 text-center text-text-secondary flex flex-col items-center justify-center bg-white">
                  <FileText className="w-10 h-10 text-text-secondary/40 mb-3" />
                  <h4 className="text-xs font-semibold text-text-primary mb-1">No associated posts</h4>
                  <p className="text-[10px] text-text-secondary max-w-[240px]">
                    Create posts inside the content editor linked to the associated pillars to populate this list.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {contentPieces.map((piece: any) => (
                    <div 
                      key={piece.id}
                      className="bg-white border border-border-warm hover:border-primary/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-surface-container border border-border-warm flex items-center justify-center text-text-secondary font-bold uppercase tracking-wider text-[10px]">
                          {piece.type.slice(0, 3)}
                        </div>
                        <div className="flex flex-col">
                          <Link href={`/content/${piece.id}`} className="hover:text-primary transition-colors">
                            <h4 className="text-xs font-bold text-text-primary line-clamp-1 leading-snug">{piece.title}</h4>
                          </Link>
                          <span className="text-[9px] text-text-secondary font-semibold mt-0.5">
                            via {piece.pillar_title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 justify-end">
                        <span className="text-[9px] text-text-secondary font-bold capitalize bg-surface-container border border-border-warm px-2 py-0.5 rounded">
                          {piece.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 border ${
                          piece.status === 'live' 
                            ? 'bg-sage/10 text-sage border-sage/20' 
                            : piece.status === 'ready' 
                              ? 'bg-primary/10 text-primary border border-primary/20' 
                              : 'bg-surface-container border border-border-warm text-text-secondary'
                        }`}>
                          {piece.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Tab 3: Pricing & Inventory */}
        {activeTab === 'pricing' && (
          <div className="glass-panel border border-border-warm rounded-3xl p-6 md:p-8 flex flex-col gap-6 bg-white">
            <div className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-3 border-b border-border-warm">
              Pricing Ledger & Value Specs
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col gap-1 p-4 bg-surface border border-border-warm rounded-2xl shadow-sm">
                <span className="text-[10px] text-text-secondary uppercase font-semibold">Retail Price</span>
                <span className="text-lg font-black text-text-primary font-mono">
                  {product.price ? `${product.price.toFixed(2)} ${product.currency || 'EUR'}` : 'N/A'}
                </span>
              </div>

              <div className="flex flex-col gap-1 p-4 bg-surface border border-border-warm rounded-2xl shadow-sm">
                <span className="text-[10px] text-text-secondary uppercase font-semibold">Member Price (Wholesale)</span>
                <span className="text-lg font-black text-text-primary font-mono">
                  {product.wholesale_price ? `${product.wholesale_price.toFixed(2)} ${product.currency || 'EUR'}` : 'N/A'}
                </span>
              </div>

              <div className="flex flex-col gap-1 p-4 bg-surface border border-border-warm rounded-2xl shadow-sm">
                <span className="text-[10px] text-text-secondary uppercase font-semibold">Point Value (PV)</span>
                <span className="text-lg font-black text-primary font-mono">
                  {product.pv !== null ? product.pv : 'N/A'}
                </span>
              </div>

              <div className="flex flex-col gap-1 p-4 bg-surface border border-border-warm rounded-2xl shadow-sm">
                <span className="text-[10px] text-text-secondary uppercase font-semibold">Currency Denomination</span>
                <span className="text-lg font-black text-text-primary font-mono">
                  {product.currency || 'EUR'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pt-4 border-t border-border-warm">
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Scraper Sync Configuration</h3>
                <div className="p-4 bg-surface border border-border-warm rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-text-primary">Manual Price Freeze</span>
                    <span className="text-[10px] text-text-secondary">
                      When locked, synchronization scripts will never overwrite manual edits on this product.
                    </span>
                  </div>
                  
                  {product.source === 'amway-price-checker' ? (
                    <button
                      onClick={handleToggleLock}
                      disabled={isTogglingLock}
                      className={`h-9 px-4 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all border ${
                        syncLocked
                          ? 'bg-primary/10 border border-primary/20 text-primary'
                          : 'bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
                      }`}
                    >
                      {syncLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      {syncLocked ? 'Locked' : 'Unlocked'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-text-secondary uppercase italic">
                      Vera Original (No Sync)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Catalog Metadata</h3>
                <div className="p-4 bg-surface border border-border-warm rounded-2xl grid grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-text-secondary uppercase font-semibold">Origin Database</span>
                    <span className="font-bold text-text-primary capitalize">{product.brand}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-text-secondary uppercase font-semibold">Record Registered</span>
                    <span className="font-bold text-text-primary" suppressHydrationWarning>
                      {new Date(product.created_at).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </section>
    </div>
  );
}
