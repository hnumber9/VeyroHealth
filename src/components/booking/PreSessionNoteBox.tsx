import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMyAppointmentNote, saveMyAppointmentNote } from "@/lib/client-account.functions";
import { getNoteByToken, saveNoteByToken } from "@/lib/manage-booking.functions";

/**
 * "Help your therapist get to know you" — optional pre-session note, visible
 * only to the therapist for that appointment. Editable until the session starts.
 */
export function PreSessionNoteBox({
  appointmentId,
  manageToken,
  onSaved,
}: {
  appointmentId: string;
  /** Guests (no account) read/save the note through their manage link. */
  manageToken?: string | null;
  onSaved?: (note: string | null) => void;
}) {
  const fetchMine = useServerFn(getMyAppointmentNote);
  const saveMine = useServerFn(saveMyAppointmentNote);
  const fetchByToken = useServerFn(getNoteByToken);
  const saveByToken = useServerFn(saveNoteByToken);
  const fetchNote = useCallback(
    (args: { data: { appointmentId: string } }) =>
      manageToken ? fetchByToken({ data: { token: manageToken } }) : fetchMine(args),
    [manageToken, fetchByToken, fetchMine],
  );
  const saveNote = useCallback(
    (args: { data: { appointmentId: string; note: string } }) =>
      manageToken
        ? saveByToken({ data: { token: manageToken, note: args.data.note } })
        : saveMine(args),
    [manageToken, saveByToken, saveMine],
  );
  const [note, setNote] = useState("");
  const [editable, setEditable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchNote({ data: { appointmentId } })
      .then((res) => {
        if (cancelled) return;
        setNote(res.note ?? "");
        setSaved(!!res.note);
        setEditable(res.editable);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [appointmentId, fetchNote]);

  useEffect(() => {
    if (!loaded || !editable || !dirtyRef.current) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      setError(null);
      try {
        const result = await saveNote({ data: { appointmentId, note } });
        dirtyRef.current = false;
        setNote(result.note ?? "");
        setSaved(true);
        onSaved?.(result.note);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save your note.");
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [appointmentId, editable, loaded, note, onSaved, saveNote]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await saveNote({ data: { appointmentId, note } });
      dirtyRef.current = false;
      setNote(result.note ?? "");
      setSaved(true);
      onSaved?.(result.note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your note.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded || !editable) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 text-left shadow-[var(--shadow-soft)]">
      <h2 className="font-serif text-lg text-foreground">Help your therapist get to know you</h2>
      <p className="mt-2 text-sm text-foreground/75">
        Is there anything you&apos;d like your therapist to know before your first session?
      </p>
      <p className="mt-1 text-xs text-foreground/60">
        Share as much or as little as you feel comfortable with. Your response will only be shared
        with your chosen therapist.
      </p>
      <textarea
        rows={5}
        value={note}
        onChange={(e) => {
          dirtyRef.current = true;
          setNote(e.target.value);
          setSaved(false);
        }}
        maxLength={4000}
        placeholder="Optional — you can add or change this any time before your session."
        className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary/60"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saved ? "Update note" : "Share with my therapist"}
        </Button>
        {saving && <span className="text-sm text-foreground/60">Saving…</span>}
        {saved && !saving && (
          <span className="inline-flex items-center gap-1.5 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </div>
  );
}
