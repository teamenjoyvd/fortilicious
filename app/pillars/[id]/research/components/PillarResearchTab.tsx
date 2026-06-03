'use client';

import { useState } from 'react';
import { createResearchEntry, deleteResearchEntry, toggleResearchEntryPin } from '@/lib/actions/research';
import { uploadAsset, deleteAsset } from '@/lib/actions/assets';
import { 
  Pin, 
  Trash2, 
  Paperclip, 
  Plus, 
  Link2, 
  FileText, 
  ExternalLink, 
  File, 
  FileImage, 
  FileVideo, 
  Loader2, 
  Bookmark, 
  AlertCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Asset {
  id: string;
  file_name: string;
  file_type: 'image' | 'pdf' | 'video' | 'external_link';
  file_size_bytes: number;
  url: string;
}

interface ResearchEntry {
  id: string;
  type: 'note' | 'link';
  title: string | null;
  body: string | null;
  url: string | null;
  pinned: boolean;
  created_at: string;
  assets: Asset[];
}

interface PillarResearchTabProps {
  pillarId: string;
  researchEntries: ResearchEntry[];
}

export default function PillarResearchTab({ pillarId, researchEntries }: PillarResearchTabProps) {
  const router = useRouter();
  const [activeFormTab, setActiveFormTab] = useState<'note' | 'link'>('note');
  
  // Form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  
  // Async states
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [uploadingEntryId, setUploadingEntryId] = useState<string | null>(null);

  // Format bytes helper
  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Handle entry creation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Title is required');
      return;
    }
    if (activeFormTab === 'link' && !url.trim()) {
      setErrorMsg('URL is required for link bookmarks');
      return;
    }

    setIsPending(true);
    setErrorMsg('');

    try {
      const res = await createResearchEntry(
        pillarId,
        activeFormTab,
        title.trim(),
        activeFormTab === 'note' ? body.trim() : '',
        activeFormTab === 'link' ? url.trim() : '',
        false
      );

      if (res.success) {
        setTitle('');
        setBody('');
        setUrl('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to save research entry');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  }

  // Handle Pin toggle
  async function handleTogglePin(id: string, currentPin: boolean) {
    try {
      const res = await toggleResearchEntryPin(id, !currentPin);
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  }

  // Handle Entry delete
  async function handleDeleteEntry(id: string) {
    if (!confirm('Are you sure you want to delete this research entry and all its attached files?')) return;
    try {
      const res = await deleteResearchEntry(id);
      if (res.success) {
        router.refresh();
      }
    } catch (err) {
      console.error('Failed to delete research entry:', err);
    }
  }

  // Handle File Upload
  async function handleFileUpload(entryId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingEntryId(entryId);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadAsset(formData, { research_entry_id: entryId });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred during file upload');
    } finally {
      setUploadingEntryId(null);
      e.target.value = ''; // clear input
    }
  }

  // Handle Asset Delete
  async function handleDeleteAsset(assetId: string) {
    if (!confirm('Are you sure you want to delete this attachment?')) return;
    try {
      const res = await deleteAsset(assetId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete attachment');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting attachment');
    }
  }

  // Render Asset Icon helper
  function renderAssetIcon(fileType: string) {
    switch (fileType) {
      case 'image':
        return <FileImage className="w-3.5 h-3.5 text-primary" />;
      case 'video':
        return <FileVideo className="w-3.5 h-3.5 text-sage" />;
      case 'pdf':
        return <FileText className="w-3.5 h-3.5 text-teal" />;
      default:
        return <File className="w-3.5 h-3.5 text-text-secondary" />;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-300">
      
      {/* Log Research Form Panel on Left */}
      <section className="bg-white border border-border-warm rounded-3xl p-6 relative warm-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Bookmark className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text-primary">Log Research</h2>
        </div>

        {/* Tab Selector Note / Link */}
        <div className="flex bg-surface-container p-1 rounded-xl border border-border-warm mb-5">
          <button
            onClick={() => {
              setActiveFormTab('note');
              setErrorMsg('');
            }}
            className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeFormTab === 'note'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Research Note
          </button>
          <button
            onClick={() => {
              setActiveFormTab('link');
              setErrorMsg('');
            }}
            className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeFormTab === 'link'
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link Bookmark
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={activeFormTab === 'note' ? 'e.g. Artistry Skin Nutrition Core Value' : 'e.g. PubMed Hydration Clinical Study'}
              className="h-10 px-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all"
              required
            />
          </div>

          {activeFormTab === 'note' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Body & Notes</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Log bullet points, references, quotes, or transcripts..."
                className="p-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all resize-none"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Reference URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. https://pubmed.ncbi.nlm.nih.gov/..."
                className="h-10 px-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all"
                required={activeFormTab === 'link'}
              />
            </div>
          )}

          {errorMsg && (
            <div className="text-xs font-bold text-burgundy bg-burgundy/5 border border-burgundy/20 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-primary hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Logging Research...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 text-white" />
                Add Research
              </>
            )}
          </button>
        </form>
      </section>

      {/* Grid displaying entries on Right */}
      <section className="lg:col-span-2 flex flex-col gap-6 w-full">
        {researchEntries.length === 0 ? (
          <div className="glass-panel border border-border-warm rounded-3xl p-12 text-center text-text-secondary flex flex-col items-center justify-center bg-white min-h-[300px]">
            <Bookmark className="w-12 h-12 text-text-secondary/40 mb-4" />
            <h3 className="text-sm font-semibold text-text-primary mb-1">No research logged</h3>
            <p className="text-xs text-text-secondary max-w-[280px]">
              Use the sidebar to log notes, bookmark references, and attach files for this Evergreen Pillar.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {researchEntries.map((item) => (
              <div
                key={item.id}
                className={`bg-white border rounded-3xl p-5 flex flex-col gap-4 relative group transition-all warm-shadow ${
                  item.pinned 
                    ? 'border-primary/40 bg-primary/[0.02]' 
                    : 'border-border-warm hover:border-primary/30'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      item.type === 'link' 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-sage/10 text-sage'
                    }`}>
                      {item.type === 'link' ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-sm font-serif font-bold text-text-primary leading-tight">
                        {item.title}
                      </h3>
                      <span className="text-[10px] text-text-secondary font-semibold mt-0.5">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTogglePin(item.id, item.pinned)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        item.pinned
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
                      }`}
                      title={item.pinned ? 'Unpin research' : 'Pin research'}
                    >
                      <Pin className={`w-3.5 h-3.5 ${item.pinned ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(item.id)}
                      className="p-1.5 bg-white border border-border-warm text-text-secondary hover:text-burgundy hover:border-burgundy/40 rounded-lg transition-colors"
                      title="Delete research entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                {item.type === 'note' ? (
                  item.body && (
                    <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap pl-10">
                      {item.body}
                    </p>
                  )
                ) : (
                  item.url && (
                    <div className="pl-10 flex flex-col gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold truncate max-w-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        {item.url}
                      </a>
                      {item.body && (
                        <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                          {item.body}
                        </p>
                      )}
                    </div>
                  )
                )}

                {/* Attached Files List */}
                {item.assets && item.assets.length > 0 && (
                  <div className="pl-10 border-t border-border-warm/60 pt-3 mt-1 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                      Attached Files ({item.assets.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {item.assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between gap-3 bg-surface-container border border-border-warm hover:border-primary/35 p-2 rounded-xl transition-all"
                        >
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 overflow-hidden flex-1 group/link"
                          >
                            {renderAssetIcon(asset.file_type)}
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-[10px] font-semibold text-text-primary group-hover/link:text-primary transition-colors truncate">
                                {asset.file_name}
                              </span>
                              <span className="text-[9px] text-text-secondary">
                                {formatBytes(asset.file_size_bytes)}
                              </span>
                            </div>
                          </a>

                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1 bg-white border border-border-warm hover:bg-burgundy/10 text-text-secondary hover:text-burgundy rounded-md transition-colors"
                            title="Delete file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* File Attachment Input/Zone */}
                <div className="pl-10 flex items-center justify-end mt-1">
                  {uploadingEntryId === item.id ? (
                    <span className="text-[10px] text-text-secondary font-bold flex items-center gap-1.5 bg-surface-container border border-border-warm px-3 py-1.5 rounded-xl">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      Uploading asset (under 50MB)...
                    </span>
                  ) : (
                    <label className="text-[10px] text-text-secondary hover:text-text-primary font-bold flex items-center gap-1.5 bg-white hover:bg-surface-container border border-border-warm px-3 py-1.5 rounded-xl cursor-pointer transition-all">
                      <Paperclip className="w-3.5 h-3.5 text-primary" />
                      Attach File (Image, PDF, Video)
                      <input
                        type="file"
                        onChange={(e) => handleFileUpload(item.id, e)}
                        className="hidden"
                        accept="image/*,application/pdf,video/*"
                      />
                    </label>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

