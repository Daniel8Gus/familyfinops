import { useState } from "react";
import { api } from "../api/client.ts";

interface ContributeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LogContributionModal({ onClose, onSuccess }: ContributeModalProps) {
  const [who, setWho] = useState<"daniel" | "shelly">("daniel");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    setLoading(true);
    try {
      await api.paybox.contribute(who, amt, note || undefined);
      onSuccess();
      onClose();
    } catch {
      setError("Failed to log contribution");
    } finally {
      setLoading(false);
    }
  };

  return <Modal title="Log Contribution" onClose={onClose}>
    <Label>Who</Label>
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {(["daniel", "shelly"] as const).map((p) => (
        <button key={p} onClick={() => setWho(p)} style={{
          flex: 1, padding: "8px 0", borderRadius: "var(--radius-sm)",
          border: `1px solid ${who === p ? "var(--green)" : "var(--border)"}`,
          background: who === p ? "var(--green-dim)" : "transparent",
          color: who === p ? "var(--green)" : "var(--text-secondary)",
          fontSize: 13, fontWeight: 500, textTransform: "capitalize",
        }}>
          {p}
        </button>
      ))}
    </div>

    <Label>Amount (₪)</Label>
    <Input value={amount} onChange={setAmount} placeholder="500" type="number" />

    <Label>Note (optional)</Label>
    <Input value={note} onChange={setNote} placeholder="March contribution" />

    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>{error}</div>}

    <SubmitBtn loading={loading} label="Log Contribution" onClick={handleSubmit} />
  </Modal>;
}

interface PayModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LogPaymentModal({ onClose, onSuccess }: PayModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    if (!category.trim()) { setError("Category is required"); return; }
    setLoading(true);
    try {
      await api.paybox.pay(amt, category, note || undefined);
      onSuccess();
      onClose();
    } catch {
      setError("Failed to log payment");
    } finally {
      setLoading(false);
    }
  };

  return <Modal title="Log Payment" onClose={onClose}>
    <Label>Amount (₪)</Label>
    <Input value={amount} onChange={setAmount} placeholder="250" type="number" />

    <Label>Category</Label>
    <Input value={category} onChange={setCategory} placeholder="groceries" />

    <Label>Note (optional)</Label>
    <Input value={note} onChange={setNote} placeholder="Rami Levy" />

    {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>{error}</div>}

    <SubmitBtn loading={loading} label="Log Payment" onClick={handleSubmit} />
  </Modal>;
}

// ── Shared sub-components ─────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "28px 28px 24px",
        width: "100%", maxWidth: 400,
        boxShadow: "var(--shadow)",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
          <button onClick={onClose} style={{
            background: "transparent", color: "var(--text-secondary)",
            fontSize: 20, lineHeight: 1, padding: "0 4px",
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6 }}>{children}</div>;
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        fontSize: 14,
        fontFamily: "var(--font-sans)",
        outline: "none",
        marginBottom: 16,
        boxSizing: "border-box",
      }}
    />
  );
}

function SubmitBtn({ loading, label, onClick }: { loading: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", padding: "11px",
      background: "var(--green)", color: "#fff",
      borderRadius: "var(--radius-sm)",
      fontSize: 14, fontWeight: 600,
      opacity: loading ? 0.7 : 1,
      marginTop: 4,
    }}>
      {loading ? "Saving…" : label}
    </button>
  );
}
