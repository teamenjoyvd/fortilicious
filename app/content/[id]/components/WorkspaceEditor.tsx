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
  ExternalLink,
  FileImage,
  FileVideo,
  File,
  Plus,
  BookOpen,
  Play,
  CheckCircle2
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
      case 'image': return <FileImage className="w-4 h-4 text-rose-400" />;
      case 'video': return <FileVideo className="w-4 h-4 text-sky-400" />;
      case 'pdf': return <FileText className="w-4 h-4 text-emerald-400" />;
      default: return <File className="w-4 h-4 text-slate-400" />;
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <Link
          href="/content"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Workspace
        </Link>

        <div className="flex items-center gap-2">
          {saveStatus === 'success' && (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/20 border border-emerald-900/40 px-3 py-1.5 rounded-xl">
              <Check className="w-3.5 h-3.5" />
              Saved Successfully!
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs font-bold text-red-400 flex items-center gap-1 bg-red-950/20 border border-red-900/40 px-3 py-1.5 rounded-xl max-w-xs truncate">
              <X className="w-3.5 h-3.5" />
              {errorMsg || 'Save Failed'}
            </span>
          )}

          <button
            onClick={() => handleSaveDetails()}
            disabled={isSaving}
            className="h-10 px-4 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Draft
              </>
            )}
          </button>

          <button
            onClick={handleDeletePiece}
            disabled={isDeleting}
            className="h-10 w-10 bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/30 hover:border-rose-950/50 text-rose-400 hover:text-rose-300 rounded-xl flex items-center justify-center transition-all"
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
            <div className="glass-panel border border-rose-500/30 bg-rose-950/5 rounded-3xl p-5 md:p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2 border-b border-rose-950/20 pb-3">
                <Play className="w-5 h-5 text-rose-500 fill-current animate-pulse" />
                <div className="flex flex-col">
                  <h2 className="text-sm font-extrabold text-white">Prepare for Publication</h2>
                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider mt-0.5">
                    Post is {status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* Checklist */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    Pre-Publishing Guide
                  </span>
                  <div className="flex flex-col gap-2">
                    {checklist.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2.5 p-2 bg-slate-950/60 border border-slate-900 rounded-xl cursor-pointer hover:border-slate-800 transition-colors text-xs text-slate-300 font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggleChecklistItem(item.id)}
                          className="mt-0.5 rounded border-slate-800 text-rose-500 focus:ring-rose-500 focus:ring-offset-slate-950 cursor-pointer"
                        />
                        <span className={item.checked ? 'line-through text-slate-500' : ''}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    Fast Publishing Actions
                  </span>
                  
                  <button
                    onClick={handleCopyCaption}
                    className={`h-11 w-full rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                      copied 
                        ? 'bg-emerald-600 text-white shadow-emerald-500/10'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/10'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 animate-in zoom-in" />
                        Caption Copied!
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
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
                      className="h-11 w-full bg-slate-950 border border-slate-900 hover:border-slate-850 hover:bg-slate-900 text-rose-400 hover:text-rose-300 text-xs font-bold rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all shadow-md"
                    >
                      <span className="flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-rose-500" />
                        Download Zipped Assets Bundle
                      </span>
                      <span className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">
                        {piece.assets.length} attachments ({formatBytes(piece.assets.reduce((a, b) => a + (b.file_size_bytes || 0), 0))})
                      </span>
                    </a>
                  ) : (
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-center text-[10px] text-slate-500 italic leading-relaxed">
                      No media files are attached to this draft yet. Upload files in the sidebar to bundle media.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="glass-panel border border-slate-900 rounded-3xl p-5 md:p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-950 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                Script & Caption Editor
              </h2>
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Created {new Date(piece.created_at).toLocaleDateString()}
              </span>
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Post Title..."
              className="text-lg font-extrabold bg-transparent text-white border-b border-transparent focus:border-slate-800 focus:outline-none pb-2 transition-all"
              required
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={16}
              placeholder="Start drafting your social post captions, outlines, hooks, or video scripts here..."
              className="p-4 text-sm bg-slate-950/40 border border-slate-900 text-slate-100 rounded-2xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-700 transition-all resize-none leading-relaxed"
            />
          </div>
        </section>

        {/* Sidebar panels */}
        <section className="flex flex-col gap-6 w-full">
          
          {/* Metadata configurations panel */}
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-rose-500" />
              <h2 className="text-sm font-bold text-white">Post Configuration</h2>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Post Format</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="h-10 px-2.5 text-xs bg-slate-950 border border-slate-900 text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="script">Script Outline</option>
                <option value="caption">Post Caption</option>
                <option value="short_form">Short-form Video</option>
                <option value="video">Long-form Video</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Publishing Status</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="h-10 px-2.5 text-xs bg-slate-950 border border-slate-900 text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="draft">Draft Post</option>
                <option value="ready">Ready to Post</option>
                <option value="live">Live / Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400">Primary Content Pillar</label>
              <select
                value={primaryPillarId}
                onChange={(e) => setPrimaryPillarId(e.target.value)}
                className="h-10 px-2.5 text-xs bg-slate-950 border border-slate-900 text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
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

          {/* Connected Topic Clusters (Primary & Secondary graph junctions!) */}
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              <h2 className="text-sm font-bold text-white">Topic Associations</h2>
            </div>

            {/* List current connections */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Current Clusters
              </span>
              
              <div className="flex flex-col gap-2">
                {piece.pillar_content.map((junction) => (
                  <div
                    key={junction.pillar_id}
                    className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-900 p-2.5 rounded-xl"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Sparkles className={`w-3.5 h-3.5 shrink-0 ${junction.is_primary ? 'text-rose-400' : 'text-slate-500'}`} />
                      <span className="text-xs font-semibold text-slate-300 truncate">
                        {junction.content_pillars.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {junction.is_primary ? (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-extrabold uppercase tracking-wider">
                          Primary
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUnlinkSecondary(junction.pillar_id)}
                          className="p-1 bg-slate-900 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded-md transition-colors"
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
              <div className="flex flex-col gap-2 border-t border-slate-950 pt-3 mt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Link Secondary Pillar
                </span>
                <div className="flex gap-2">
                  <select
                    value={selectedSecondaryId}
                    onChange={(e) => setSelectedSecondaryId(e.target.value)}
                    className="flex-1 h-9 px-2 text-xs bg-slate-950 border border-slate-800 text-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
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
                    className="h-9 w-9 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center transition-colors"
                    title="Add connection"
                  >
                    {linkingPillar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Media Attachments Box */}
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="w-5 h-5 text-rose-500" />
              <h2 className="text-sm font-bold text-white">Media Attachments</h2>
            </div>

            {/* List current attachments */}
            {piece.assets && piece.assets.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Files ({piece.assets.length})
                </span>
                
                <div className="flex flex-col gap-2">
                  {piece.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-900 hover:border-slate-850 p-2.5 rounded-xl transition-all"
                    >
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 overflow-hidden flex-1 group/link"
                      >
                        {renderAssetIcon(asset.file_type)}
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-[10px] font-semibold text-slate-300 group-hover/link:text-rose-400 transition-colors truncate">
                            {asset.file_name}
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5">
                            {formatBytes(asset.file_size_bytes)}
                          </span>
                        </div>
                      </a>

                      <button
                        onClick={() => handleDeleteFile(asset.id)}
                        className="p-1 bg-slate-900 hover:bg-rose-950/20 text-slate-500 hover:text-rose-400 rounded-md transition-colors"
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
            <div className="border-t border-slate-950 pt-3 mt-1 flex items-center justify-end">
              {uploading ? (
                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 bg-slate-950 border border-slate-900 px-3.5 py-2 rounded-xl">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                  Uploading attachment...
                </span>
              ) : (
                <label className="w-full text-center text-[10px] text-slate-400 hover:text-slate-200 font-bold flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-850 px-3.5 py-2 rounded-xl cursor-pointer transition-all">
                  <Paperclip className="w-3.5 h-3.5 text-rose-500" />
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
