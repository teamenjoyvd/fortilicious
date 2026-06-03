import { useState } from "react";
import {
  Home, Sparkles, FileText, Calendar, Plus, Bell,
  ChevronRight, Check, X, ArrowRight, Inbox, Search
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────
const T = {
  bg:           "#F8F4EF",
  surface:      "#FFFFFF",
  surface2:     "#F0EBE3",
  primary:      "#2B5730",
  primaryLight: "#EBF2EC",
  accent:       "#CF6B47",
  accentLight:  "#FBF0EA",
  text:         "#1A1714",
  muted:        "#7A756F",
  border:       "#E6E0D8",
};

const FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
  * { box-sizing: border-box; }
  ::-webkit-scrollbar { display: none; }
  textarea:focus { outline: none; }
  button { font-family: 'DM Sans', sans-serif; }
`;

// ─── Mock data ─────────────────────────────────────────────────────
const PILLARS = [
  { id: 1, title: "Insulin & Energy Balance", pieces: 5, updated: "2d ago" },
  { id: 2, title: "Nutrilite Deep Dive",      pieces: 3, updated: "4d ago" },
  { id: 3, title: "Vera's Wellness Journey",  pieces: 7, updated: "1w ago" },
  { id: 4, title: "Skincare from Within",     pieces: 2, updated: "2w ago" },
];

const PIECES = [
  { id: 1, title: "No más picos de azúcar — lo que nadie te dice",     type: "reel",    status: "scheduled", pillar: "Insulin & Energy Balance" },
  { id: 2, title: "5 signs your energy crash is a blood sugar issue",  type: "caption", status: "ready",     pillar: "Insulin & Energy Balance" },
  { id: 3, title: "Hook — \"I used to hit a wall at 3pm every day…\"", type: "hook",    status: "draft",     pillar: "Insulin & Energy Balance" },
  { id: 4, title: "Nutrilite Daily — what I actually take and why",    type: "script",  status: "draft",     pillar: "Nutrilite Deep Dive"       },
  { id: 5, title: "My morning stack (the honest version)",             type: "story",   status: "live",      pillar: "Vera's Wellness Journey"   },
];

const WEEK = [
  { day: "Mon", date: "2",  posts: [{ title: "Morning stack reel", ch: "instagram", time: "7:00 AM", live: true  }] },
  { day: "Tue", date: "3",  posts: [] },
  { day: "Wed", date: "4",  posts: [
    { title: "No más picos de azúcar", ch: "tiktok",    time: "6:30 PM", live: false },
    { title: "No más picos de azúcar", ch: "instagram", time: "7:00 PM", live: false },
  ]},
  { day: "Thu", date: "5",  posts: [{ title: "5 signs your energy crash…", ch: "facebook", time: "12:00 PM", live: false }] },
  { day: "Fri", date: "6",  posts: [] },
  { day: "Sat", date: "7",  posts: [{ title: "My morning stack", ch: "instagram", time: "9:00 AM", live: false }] },
  { day: "Sun", date: "8",  posts: [] },
];

const INBOX = [
  { id: 1, body: "Content idea: \"what happens to your body when you skip breakfast for 30 days\" — tie to Nutrilite Daily",  created: "10 min ago" },
  { id: 2, body: "https://www.healthline.com/nutrition/blood-sugar-spikes — good research for insulin pillar",                created: "1h ago"     },
  { id: 3, body: "Hook variation: start with the 3pm crash feeling, not the product",                                         created: "Yesterday"  },
];

const CH_COLORS  = { tiktok: "#000",     instagram: "#E1306C", facebook: "#1877F2", youtube: "#FF0000" };
const CH_LABELS  = { tiktok: "TikTok",   instagram: "Instagram", facebook: "Facebook", youtube: "YouTube" };
const TYPE_CLRS  = { reel: "#CF6B47", caption: "#2B5730", hook: "#7A4B9E", script: "#1A5C9A", story: "#C4963A" };
const STS_STYLES = {
  draft:     { bg: "#F5F0E8", color: "#7A756F" },
  ready:     { bg: "#EBF2EC", color: "#2B5730" },
  scheduled: { bg: "#EEF4FF", color: "#1A5C9A" },
  live:      { bg: "#FBF0EA", color: "#CF6B47" },
  archived:  { bg: "#F5F5F5", color: "#AAAAAA" },
};

// ─── Atoms ─────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => (
  <span style={{
    background: (TYPE_CLRS[type] || "#999") + "20",
    color: TYPE_CLRS[type] || "#999",
    padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
  }}>{type}</span>
);

const StatusBadge = ({ status }) => {
  const s = STS_STYLES[status] || STS_STYLES.draft;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
    }}>{status}</span>
  );
};

const SectionHead = ({ title, action, onAction }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
    <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: T.text }}>{title}</div>
    {action && (
      <button onClick={onAction} style={{
        display: "flex", alignItems: "center", gap: 2,
        fontSize: 13, color: T.primary, background: "none", border: "none",
        cursor: "pointer", fontWeight: 600,
      }}>{action} <ChevronRight size={14} /></button>
    )}
  </div>
);

// ─── Dashboard ─────────────────────────────────────────────────────
const DashScreen = ({ go }) => (
  <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 110px" }}>
    {/* Header */}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
      <div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: T.text, lineHeight: 1.1 }}>
          Good morning,<br />Vera ✦
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>Monday · June 2, 2025</div>
      </div>
      <button style={{
        width: 38, height: 38, borderRadius: 19, background: T.surface,
        border: `1px solid ${T.border}`, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Bell size={16} color={T.muted} />
      </button>
    </div>

    {/* Search bar */}
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: "12px 14px", marginBottom: 22,
    }}>
      <Search size={15} color={T.muted} />
      <span style={{ fontSize: 14, color: T.muted }}>Search pillars, content, products…</span>
    </div>

    {/* Week stats */}
    <div style={{ background: T.primary, borderRadius: 20, padding: "18px 20px", marginBottom: 22, color: "#fff" }}>
      <div style={{ fontSize: 11, letterSpacing: 1.2, opacity: 0.6, fontWeight: 700, marginBottom: 14 }}>THIS WEEK</div>
      <div style={{ display: "flex" }}>
        {[["4","scheduled"], ["1","going live today"], ["3","in progress"]].map(([n, l], i) => (
          <div key={i} style={{
            flex: 1,
            paddingLeft: i > 0 ? 14 : 0,
            paddingRight: i < 2 ? 14 : 0,
            borderRight: i < 2 ? "1px solid rgba(255,255,255,0.18)" : "none",
          }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 34, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 11, opacity: 0.65, marginTop: 3, lineHeight: 1.3 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Active pillars */}
    <div style={{ marginBottom: 22 }}>
      <SectionHead title="Active Pillars" action="All" onAction={() => go("pillars")} />
      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {PILLARS.slice(0, 3).map(p => (
          <div key={p.id} style={{
            minWidth: 148, background: T.surface, borderRadius: 16,
            padding: "14px", border: `1px solid ${T.border}`, flexShrink: 0,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: T.primaryLight,
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
            }}>
              <Sparkles size={14} color={T.primary} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4, marginBottom: 6 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{p.pieces} pieces</div>
          </div>
        ))}
      </div>
    </div>

    {/* Up next */}
    <div>
      <SectionHead title="Up next" action="All content" onAction={() => go("content")} />
      {PIECES.filter(p => ["scheduled", "ready"].includes(p.status)).map(p => (
        <div key={p.id} style={{
          background: T.surface, borderRadius: 16, padding: "14px 16px",
          border: `1px solid ${T.border}`, marginBottom: 10,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.4, marginBottom: 8 }}>{p.title}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <TypeBadge type={p.type} />
            <StatusBadge status={p.status} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Pillars ────────────────────────────────────────────────────────
const PillarsScreen = () => {
  const [filter, setFilter] = useState("all");
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 110px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: T.text, lineHeight: 1.1 }}>Content<br />Pillars</div>
        <button style={{
          background: T.primary, color: "#fff", border: "none",
          borderRadius: 20, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 4,
        }}>+ New</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {["all", "active", "archived"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 16px", borderRadius: 20,
            border: `1.5px solid ${filter === f ? T.primary : T.border}`,
            background: filter === f ? T.primaryLight : "transparent",
            color: filter === f ? T.primary : T.muted,
            fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
          }}>{f}</button>
        ))}
      </div>

      {PILLARS.map(p => (
        <div key={p.id} style={{
          background: T.surface, borderRadius: 18, padding: "16px",
          border: `1px solid ${T.border}`, marginBottom: 12,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, background: T.primaryLight, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={18} color={T.primary} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: T.text, lineHeight: 1.35, marginBottom: 6 }}>
              {p.title}
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: T.muted }}>
              <span>{p.pieces} pieces</span>
              <span>Updated {p.updated}</span>
            </div>
          </div>
          <ChevronRight size={16} color={T.muted} style={{ marginTop: 3 }} />
        </div>
      ))}
    </div>
  );
};

// ─── Content ────────────────────────────────────────────────────────
const ContentScreen = () => {
  const [filter, setFilter] = useState("all");
  const shown = filter === "all" ? PIECES : PIECES.filter(p => p.status === filter);
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 110px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: T.text }}>Content</div>
        <button style={{
          background: T.accent, color: "#fff", border: "none",
          borderRadius: 20, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ New Piece</button>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 22, paddingBottom: 2 }}>
        {["all", "draft", "ready", "scheduled", "live"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 14px", borderRadius: 20, flexShrink: 0,
            border: `1.5px solid ${filter === f ? T.accent : T.border}`,
            background: filter === f ? T.accentLight : "transparent",
            color: filter === f ? T.accent : T.muted,
            fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
          }}>{f}</button>
        ))}
      </div>

      {shown.map(p => (
        <div key={p.id} style={{
          background: T.surface, borderRadius: 16, padding: "14px 16px",
          border: `1px solid ${T.border}`, marginBottom: 10,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.4, marginBottom: 8 }}>{p.title}</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <TypeBadge type={p.type} />
            <StatusBadge status={p.status} />
            <span style={{ fontSize: 11, color: T.muted }}>↳ {p.pillar}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Schedule ───────────────────────────────────────────────────────
const ScheduleScreen = () => {
  const [activeDay, setActiveDay] = useState("Mon");
  const dayData = WEEK.find(d => d.day === activeDay);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 110px" }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: T.text, marginBottom: 4 }}>Schedule</div>
      <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>June 2 – 8, 2025</div>

      {/* Week strip */}
      <div style={{
        background: T.surface, borderRadius: 18, padding: "12px 8px",
        border: `1px solid ${T.border}`, marginBottom: 24, display: "flex",
      }}>
        {WEEK.map(({ day, date, posts }) => {
          const active = day === activeDay;
          return (
            <button key={day} onClick={() => setActiveDay(day)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: active ? T.primary : T.muted }}>
                {day}
              </div>
              <div style={{
                width: 30, height: 30, borderRadius: 15,
                background: active ? T.primary : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: active ? "#fff" : T.text }}>{date}</span>
              </div>
              <div style={{ display: "flex", gap: 2, height: 6, alignItems: "center" }}>
                {posts.slice(0, 2).map((p, i) => (
                  <div key={i} style={{ width: 5, height: 5, borderRadius: 3, background: CH_COLORS[p.ch] || "#999" }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day content */}
      {dayData && dayData.posts.length === 0 ? (
        <div style={{
          background: T.surface, borderRadius: 18, padding: "32px 20px",
          border: `1px solid ${T.border}`, textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🌿</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>Nothing scheduled</div>
          <div style={{ fontSize: 13, color: T.muted }}>Rest day — or an open slot.</div>
        </div>
      ) : dayData?.posts.map((post, i) => (
        <div key={i} style={{
          background: T.surface, borderRadius: 16, padding: "14px",
          border: `1px solid ${T.border}`, marginBottom: 10,
          display: "flex", alignItems: "stretch", gap: 12,
        }}>
          <div style={{ width: 4, borderRadius: 2, background: CH_COLORS[post.ch] || "#999", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text, lineHeight: 1.35, marginBottom: 4 }}>{post.title}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{CH_LABELS[post.ch]} · {post.time}</div>
          </div>
          {post.live ? (
            <div style={{
              width: 32, height: 32, borderRadius: 16, background: T.primaryLight, flexShrink: 0, alignSelf: "center",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Check size={15} color={T.primary} strokeWidth={2.5} />
            </div>
          ) : (
            <button style={{
              background: T.accentLight, color: T.accent, border: "none",
              borderRadius: 12, padding: "6px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              alignSelf: "center", flexShrink: 0,
            }}>Mark Live</button>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Inbox ──────────────────────────────────────────────────────────
const InboxScreen = () => (
  <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 110px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
      <div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 30, color: T.text, lineHeight: 1.1 }}>Quick<br />Capture</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 5 }}>3 items waiting</div>
      </div>
    </div>

    {INBOX.map(item => (
      <div key={item.id} style={{
        background: T.surface, borderRadius: 16, padding: "14px 16px",
        border: `1px solid ${T.border}`, marginBottom: 10,
      }}>
        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, marginBottom: 10 }}>{item.body}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.muted }}>{item.created}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{
              background: T.primaryLight, color: T.primary, border: "none",
              borderRadius: 10, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>→ Pillar</button>
            <button style={{
              background: T.accentLight, color: T.accent, border: "none",
              borderRadius: 10, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>→ Content</button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Quick Capture Sheet ─────────────────────────────────────────────
const CaptureSheet = ({ onClose }) => {
  const [text, setText] = useState("");
  return (
    <div style={{
      position: "absolute", inset: 0, background: "rgba(26,23,20,0.55)",
      display: "flex", alignItems: "flex-end", zIndex: 50,
    }}>
      <div style={{
        background: T.surface, borderRadius: "24px 24px 0 0",
        padding: "24px 20px 50px", width: "100%",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: T.text }}>Quick Capture</div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 15, background: T.surface2,
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={14} color={T.muted} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 16 }}>Dump the idea. Organize later.</div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type it here… an idea, a link, a half-baked thought. It lands in your inbox."
          style={{
            width: "100%", minHeight: 110, padding: "14px",
            background: T.bg, border: `1.5px solid ${T.border}`,
            borderRadius: 14, fontSize: 15, color: T.text,
            fontFamily: "'DM Sans', sans-serif", resize: "none", lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "14px", border: `1.5px solid ${T.border}`,
            borderRadius: 14, background: "transparent", color: T.muted,
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Cancel</button>
          <button style={{
            flex: 2, padding: "14px", border: "none", borderRadius: 14,
            background: T.primary, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            Save to Inbox <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Bottom Nav ──────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", Icon: Home,     label: "Home"     },
  { id: "pillars",   Icon: Sparkles, label: "Pillars"  },
  { id: "content",   Icon: FileText, label: "Content"  },
  { id: "schedule",  Icon: Calendar, label: "Schedule" },
  { id: "inbox",     Icon: Inbox,    label: "Inbox"    },
];

// ─── App ─────────────────────────────────────────────────────────────
export default function App() {
  const [screen,  setScreen]  = useState("dashboard");
  const [capture, setCapture] = useState(false);

  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      minHeight: "100vh", background: "#D6D0C6",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{FONTS}</style>

      {/* Phone shell */}
      <div style={{
        width: 390, height: 844, borderRadius: 50, background: T.bg,
        overflow: "hidden", position: "relative",
        display: "flex", flexDirection: "column",
        boxShadow: `
          0 0 0 10px #1A1714,
          0 0 0 11px #3A3530,
          0 50px 120px rgba(0,0,0,0.45)
        `,
      }}>

        {/* Status bar */}
        <div style={{
          background: T.bg, padding: "16px 28px 8px", flexShrink: 0,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>9:41</span>
          <div style={{ width: 120, height: 32, background: "#1A1714", borderRadius: 16 }} />
          <span style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>⚡ 87%</span>
        </div>

        {/* Screen content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {screen === "dashboard" && <DashScreen go={setScreen} />}
          {screen === "pillars"   && <PillarsScreen />}
          {screen === "content"   && <ContentScreen />}
          {screen === "schedule"  && <ScheduleScreen />}
          {screen === "inbox"     && <InboxScreen />}
        </div>

        {/* FAB */}
        <button onClick={() => setCapture(true)} style={{
          position: "absolute", bottom: 94, right: 18, zIndex: 10,
          width: 52, height: 52, borderRadius: 26,
          background: T.accent, border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(207,107,71,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Plus size={22} color="#fff" strokeWidth={2.5} />
        </button>

        {/* Bottom nav */}
        <div style={{
          background: T.surface, borderTop: `1px solid ${T.border}`,
          display: "flex", padding: "10px 0 26px", flexShrink: 0,
        }}>
          {NAV.map(({ id, Icon, label }) => {
            const active = screen === id;
            const hasInbox = id === "inbox";
            return (
              <button key={id} onClick={() => setScreen(id)} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0",
                position: "relative",
              }}>
                {hasInbox && INBOX.length > 0 && (
                  <div style={{
                    position: "absolute", top: 0, right: "18%",
                    width: 8, height: 8, borderRadius: 4,
                    background: T.accent, border: `1.5px solid ${T.surface}`,
                  }} />
                )}
                <Icon size={20} color={active ? T.primary : T.muted} strokeWidth={active ? 2.5 : 1.5} />
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? T.primary : T.muted }}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick capture overlay */}
        {capture && <CaptureSheet onClose={() => setCapture(false)} />}
      </div>
    </div>
  );
}
