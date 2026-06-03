'use client';

import { useState } from 'react';
import { updateContentPiece, deleteContentPiece, associateSecondaryPillar, dissociateSecondaryPillar } from '@/lib/actions/content';
import { uploadAsset, deleteAsset } from '@/lib/actions/assets';
import { 
  ChevronLeft, 
  Clock, 
  Sparkles, 
  Trash2, 
  Check, 
  X, 
  Save, 
  Paperclip, 
  Loader2, 
  FileText, 
  Link2, 
  FileImage,
  FileVideo,
  File,
  Plus,
  BookOpen,
  Play
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Asset {
  id: string;
  file_name: string;
  file_type: 'image' | 'pdf' | 'video' | 'external_link';
  file_size_bytes: number;
  url: string;
}

interface PillarJunction {
  pillar_id: string;
  is_primary: boolean;
  content_pillars: {
    id: string;
    title: string;
  };
}

interface ContentPiece {
  id: string;
  title: string;
  type: 'caption' | 'script' | 'video' | 'short_form';
  body: string | null;
  status: 'draft' | 'ready' | 'live' | 'archived';
  published_at: string | null;
  created_at: string;
  assets: Asset[];
  pillar_content: PillarJunction[];
}

interface PillarOption {
  id: string;
  title: string;
}

interface WorkspaceEditorProps {
  piece: ContentPiece;
  allPillars: PillarOption[];
}

export default function WorkspaceEditor({ piece, allPillars }: WorkspaceEditorProps) {
  const router = useRouter();

  // Basic info states
  const [title, setTitle] = useState(piece.title);
  const [type, setType] = useState(piece.type);
  const [status, setStatus] = useState(piece.status);
  const [body, setBody] = useState(piece.body || '');

  // Active Primary Pillar
  const initialPrimary = piece.pillar_content.find((j) => j.is_primary)?.pillar_id || '';
  const [primaryPillarId, setPrimaryPillarId] = useState(initialPrimary);

  // Secondary selection state
  const [selectedSecondaryId, setSelectedSecondaryId] = useState('');

  // Async operational states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkingPillar, setLinkingPillar] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Copy & checklist states for Prepare to Post
  const [copied, setCopied] = useState(false);
  const [checklist, setChecklist] = useState([
    { id: '1', label: 'Verify Artistry / Nutrilite product links in context', checked: false },
    { id: '2', label: 'Copy post caption/script outline to clipboard', checked: false },
    { id: '3', label: 'Download and unzip complete media assets bundle', checked: false },
    { id: '4', label: 'Open Instagram / TikTok handle and prepare publishing', checked: false },
  ]);

  function toggleChecklistItem(itemId: string) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item))
    );
  }

  async function handleCopyCaption() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      // Automatically check off item 2!
      setChecklist((prev) =>
        prev.map((item) => (item.id === '2' ? { ...item, checked: true } : item))
      );
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  // Format bytes helper
  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Filter out pillars already linked (either primary or secondary)
  const linkedPillarIds = new Set(piece.pillar_content.map((j) => j.pillar_id));
  const unlinkedPillars = allPillars.filter((p) => !linkedPillarIds.has(p.id));

  const secondaryPillars = piece.pillar_content.filter((j) => !j.is_primary);

  // Save main updates
  async function handleSaveDetails(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Title is required');
      setSaveStatus('error');
      return;
    }
    if (!primaryPillarId) {
      setErrorMsg('Primary Pillar is required');
      setSaveStatus('error');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');
    setErrorMsg('');

    try {
      const res = await updateContentPiece(piece.id, {
        title: title.trim(),
        type,
        status,
        body: body.trim(),
        primaryPillarId,
      });

      if (res.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to save changes');
        setSaveStatus('error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }

  // Link secondary pillar
  async function handleLinkSecondary() {
    if (!selectedSecondaryId) return;

    setLinkingPillar(true);
    setErrorMsg('');

    try {
      const res = await associateSecondaryPillar(piece.id, selectedSecondaryId);
      if (res.success) {
        setSelectedSecondaryId('');
        router.refresh();
      } else {
        alert(res.error || 'Failed to connect secondary pillar');
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred linking secondary pillar');
    } finally {
      setLinkingPillar(false);
    }
  }

  // Unlink secondary pillar
  async function handleUnlinkSecondary(pillarId: string) {
    try {
      const res = await dissociateSecondaryPillar(piece.id, pillarId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to remove link');
      }
    } catch (err: any) {
      alert(err.message || 'Error removing link');
    }
  }

  // File upload handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadAsset(formData, { content_piece_id: piece.id });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Upload failed');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred during file upload');
    } finally {
      setUploading(false);
      e.target.value = ''; // clear input
    }
  }

  // File delete handler
  async function handleDeleteFile(assetId: string) {
    if (!confirm('Are you sure you want to remove this media attachment?')) return;
    try {
      const res = await deleteAsset(assetId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete file');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred while deleting file');
    }
  }

  // Delete Content Piece
  async function handleDeletePiece() {
    if (!confirm('Are you absolutely sure you want to delete this content draft script? This will remove all associations and permanently delete its files in storage.')) return;
    
    setIsDeleting(true);
    try {
      const res = await deleteContentPiece(piece.id);
      if (res.success) {
        router.push('/content');
      } else {
        alert(res.error || 'Failed to delete content piece');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting piece');
    } finally {
      setIsDeleting(false);
    }
  }

  function renderAssetIcon(fileType: string) {
    switch (fileType) {
      case 'image': return <FileImage className="w-4 h-4 text-primary" />;
      case 'video': return <FileVideo className="w-4 h-4 text-sage" />;
      case 'pdf': return <FileText className="w-4 h-4 text-teal" />;
      default: return <File className="w-4 h-4 text-text-secondary" />;
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-warm pb-4">
        <Link
          href="/content"
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Workspace
        </Link>

        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <span className="text-xs font-bold text-sage flex items-center gap-1 bg-sage/5 border border-sage/20 px-3 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5 text-sage" />
              Saved Successfully!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs font-bold text-burgundy flex items-center gap-1 bg-burgundy/5 border border-burgundy/20 px-3 py-1.5 rounded-xl max-w-xs truncate">
              <X className="w-3.5 h-3.5 text-burgundy" />
              {errorMsg || 'Save Failed'}
            </span>
          )}

          <button
            onClick={() => handleSaveDetails()}
            disabled={isSaving}
            className="h-10 px-4 bg-primary hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-white" />
                Save Draft
              </>
            )}
          </button>

          <button
            onClick={handleDeletePiece}
            disabled={isDeleting}
            className="h-10 w-10 bg-surface-container border border-border-warm text-text-secondary hover:text-burgundy hover:border-burgundy/40 rounded-xl flex items-center justify-center transition-all active:scale-[0.98]"
            title="Delete post draft"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4.5 h-4.5" />}
          </button>
        </div>
      </div>

      {/* Main split grid: editor in center (Left 2/3), details on sidebar (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Editor Body Panel */}
        <section className="lg:col-span-2 flex flex-col gap-6 w-full h-full">
          
          {/* Prepare for Posting Dashboard (renders if ready, scheduled, or live) */}
          {(status === 'ready' || status === 'live' || (status as string) === 'scheduled') && (
            <div className="bg-white border border-primary/20 bg-primary/[0.01] rounded-3xl p-5 md:p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300 warm-shadow">
              <div className="flex items-center gap-2 border-b border-border-warm pb-3">
                <Play className="w-5 h-5 text-primary fill-current animate-pulse" />
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold text-text-primary">Prepare for Publication</h2>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">
                    Post is {status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Checklist */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider pl-1">
                    Pre-Publishing Guide
                  </span>
                  <div className="flex flex-col gap-2">
                    {checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2.5 p-2.5 bg-surface-container border border-border-warm rounded-xl cursor-pointer hover:border-primary/30 transition-all text-xs text-text-primary font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="mt-0.5 rounded border-border-warm text-primary focus:ring-primary focus:ring-offset-white cursor-pointer"
                        />
                        <span className={item.checked ? 'line-through text-text-secondary font-normal' : ''}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider pl-1">
                    Fast Publishing Actions
                  </span>
                  
                  <button
                    onClick={handleCopyCaption}
                    className={`h-11 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                      copied 
                        ? 'bg-sage text-white'
                        : 'bg-primary hover:opacity-95 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 animate-in zoom-in text-white" />
                        Caption Copied!
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 text-white" />
                        Copy Post Caption
                      </>
                    )}
                  </button>

                  {piece.assets && piece.assets.length > 0 ? (
                    <a
                      href={`/api/content/${piece.id}/bundle`}
                      onClick={() => {
                        // Automatically check off item 3!
                        setChecklist((prev) =>
                          prev.map((item) => (item.id === '3' ? { ...item, checked: true } : item))
                        );
                      }}
                      className="h-11 w-full bg-surface-container border border-border-warm hover:bg-surface-mid text-text-primary hover:text-primary text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all shadow-sm active:scale-[0.98]"
                    >
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-primary" />
                        Download Zipped Assets Bundle
                      </span>
                      <span className="text-[8px] text-text-secondary font-semibold uppercase tracking-wider">
                        {piece.assets.length} attachments ({formatBytes(piece.assets.reduce((a, b) => a + (b.file_size_bytes || 0), 0))})
                      </span>
                    </a>
                  ) : (
                    <div className="p-3 bg-surface-container border border-border-warm rounded-xl text-center text-[10px] text-text-secondary italic leading-relaxed">
                      No media files are attached to this draft yet. Upload files in the sidebar to bundle media.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-border-warm rounded-3xl p-5 md:p-6 flex flex-col gap-4 warm-shadow">
            <div className="flex items-center justify-between border-b border-border-warm pb-3">
              <h2 className="text-base font-serif font-bold text-text-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Script & Caption Editor
              </h2>
              <span className="text-[10px] font-semibold text-text-secondary flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-text-secondary" />
                Created {new Date(piece.created_at).toLocaleDateString()}
              </span>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title..."
              className="text-lg font-serif font-bold bg-transparent text-text-primary border-b border-transparent focus:border-border-warm focus:outline-none pb-2 transition-all"
              required
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              placeholder="Start drafting your social post captions, outlines, hooks, or video scripts here..."
              className="p-4 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-2xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all resize-none leading-relaxed"
            />
          </div>
        </section>

        {/* Sidebar panels */}
        <section className="flex flex-col gap-6 w-full">
          
          {/* Metadata configurations panel */}
          <div className="bg-white border border-border-warm rounded-3xl p-6 flex flex-col gap-4 warm-shadow">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-text-primary">Post Configuration</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Post Format</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="h-10 px-2.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
              >
                <option value="script">Script Outline</option>
                <option value="caption">Post Caption</option>
                <option value="short_form">Short-form Video</option>
                <option value="video">Long-form Video</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Publishing Status</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="h-10 px-2.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
              >
                <option value="draft">Draft Post</option>
                <option value="ready">Ready to Post</option>
                <option value="live">Live / Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Primary Content Pillar</label>
              <select
                value={primaryPillarId}
                onChange={(e) => setPrimaryPillarId(e.target.value)}
                className="h-10 px-2.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
                required
              >
                <option value="" disabled>Select primary pillar</option>
                {allPillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Connected Topic Clusters */}
          <div className="bg-white border border-border-warm rounded-3xl p-6 flex flex-col gap-4 warm-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-text-primary">Topic Associations</h2>
            </div>

            {/* List current connections */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                Current Clusters
              </span>
              
              <div className="flex flex-col gap-2">
                {piece.pillar_content.map((junction) => (
                  <div
                    key={junction.pillar_id}
                    className="flex items-center justify-between gap-3 bg-surface-container border border-border-warm p-2.5 rounded-xl"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Sparkles className={`w-3.5 h-3.5 shrink-0 ${junction.is_primary ? 'text-primary' : 'text-text-secondary'}`} />
                      <span className="text-xs font-semibold text-text-primary truncate">
                        {junction.content_pillars.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {junction.is_primary ? (
                        <span className="px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider">
                          Primary
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUnlinkSecondary(junction.pillar_id)}
                          className="p-1 bg-white hover:bg-burgundy/10 text-text-secondary hover:text-burgundy border border-border-warm rounded-md transition-colors"
                          title="Remove secondary association"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Associate secondary pillar dropdown */}
            {unlinkedPillars.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border-warm pt-3 mt-1">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Link Secondary Pillar
                </span>
                <div className="flex gap-2">
                  <select
                    value={selectedSecondaryId}
                    onChange={(e) => setSelectedSecondaryId(e.target.value)}
                    className="flex-1 h-9 px-2 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
                  >
                    <option value="">Select pillar...</option>
                    {unlinkedPillars.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleLinkSecondary}
                    disabled={linkingPillar || !selectedSecondaryId}
                    className="h-9 w-9 bg-primary hover:opacity-95 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center transition-colors shadow-sm"
                    title="Add connection"
                  >
                    {linkingPillar ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Plus className="w-4 h-4 text-white" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Media Attachments Box */}
          <div className="bg-white border border-border-warm rounded-3xl p-6 flex flex-col gap-4 warm-shadow">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="w-5 h-5 text-primary" />
              <h2 className="text-sm font-bold text-text-primary">Media Attachments</h2>
            </div>

            {/* List current attachments */}
            {piece.assets && piece.assets.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                  Files ({piece.assets.length})
                </span>
                
                <div className="flex flex-col gap-2">
                  {piece.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between gap-3 bg-surface-container border border-border-warm hover:border-primary/30 p-2.5 rounded-xl transition-all"
                    >
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 overflow-hidden flex-1 group/link"
                      >
                        {renderAssetIcon(asset.file_type)}
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] font-semibold text-text-primary group-hover/link:text-primary transition-colors truncate">
                            {asset.file_name}
                          </span>
                          <span className="text-[9px] text-text-secondary mt-0.5">
                            {formatBytes(asset.file_size_bytes)}
                          </span>
                        </div>
                      </a>

                      <button
                        onClick={() => handleDeleteFile(asset.id)}
                        className="p-1 bg-white border border-border-warm hover:bg-burgundy/10 text-text-secondary hover:text-burgundy rounded-md transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Uploader Input */}
            <div className="border-t border-border-warm pt-3 mt-1 flex items-center justify-end">
              {uploading ? (
                <span className="text-[10px] text-text-secondary font-bold flex items-center gap-1.5 bg-surface-container border border-border-warm px-3.5 py-2 rounded-xl">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Uploading attachment...
                </span>
              ) : (
                <label className="w-full text-center text-[10px] text-text-secondary hover:text-text-primary font-bold flex items-center justify-center gap-1.5 bg-surface-container hover:bg-surface-mid border border-border-warm px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                  <Paperclip className="w-3.5 h-3.5 text-primary" />
                  Attach File (Image, PDF, Video)
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,application/pdf,video/*"
                  />
                </label>
              )}
            </div>
          </div>

        </section>

      </div>

    </div>
  );
}
