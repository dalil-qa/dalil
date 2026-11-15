import { Bot, Send, TriangleAlert, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CardView } from '../components/CardView.tsx';
import { Button, Card } from '../components/Card.tsx';
import { cardsByIds, sendCoachMessage } from '../coach/send.ts';
import { MAX_QUESTION_CHARS } from '../coach/client.ts';
import { symptomById } from '../data/index.ts';
import { cardsFor, recentSymptomIds } from '../logic/cards.ts';
import { latestAssessments } from '../logic/overview.ts';
import { INDICATOR_LABELS } from '../logic/status.ts';
import { useNav } from '../nav.ts';
import { useSession, type ChatMessage } from '../session.ts';
import { useStore } from '../store.ts';
import type { Assessment } from '../types.ts';

function Bubble({ m }: { m: ChatMessage }) {
  const [open, setOpen] = useState<string | null>(null);
  const cards = cardsByIds(m.cardIds);

  if (m.role === 'system') {
    return <p role="status" className="rounded-xl border border-act/50 bg-act/10 p-3 text-base text-act">{m.text}</p>;
  }
  if (m.role === 'user') {
    return (
      <div className="ml-auto flex max-w-[85%] items-start gap-2 rounded-2xl bg-cyan-700/40 p-3 text-lg text-slate-50">
        <User aria-hidden className="mt-1 shrink-0" size={18} />
        <p>{m.text}</p>
      </div>
    );
  }
  return (
    <div className="flex max-w-[92%] flex-col gap-2 rounded-2xl border border-contrast/10 bg-space-900 p-4">
      <p className="flex items-start gap-2 text-lg text-slate-100">
        <Bot aria-hidden className="mt-1 shrink-0 text-cyan-400" size={20} />
        <span>{m.text}</span>
      </p>
      {m.fallback ? (
        <div className="flex flex-col gap-3">{cards.map((c) => <CardView key={c.id} card={c} />)}</div>
      ) : (
        cards.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-400">Sources:</span>
              {cards.map((c) => (
                <button key={c.id} type="button" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)} className="rounded-full border border-cyan-400/50 px-3 py-1 text-sm text-cyan-400 hover:bg-cyan-700/30 focus-visible:outline-2 focus-visible:outline-cyan-400">
                  {c.title}
                </button>
              ))}
            </div>
            {cards.filter((c) => c.id === open).map((c) => <CardView key={c.id} card={c} />)}
          </>
        )
      )}
    </div>
  );
}

export function Coach() {
  const crewId = useStore((s) => s.crewId);
  const day = useStore((s) => s.missionDay);
  const readings = useStore((s) => s.readings);
  const logs = useStore((s) => s.symptoms);
  const chat = useSession((s) => s.chats[crewId]) ?? [];
  const sending = useSession((s) => s.sending);
  const go = useNav((s) => s.go);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { assessments, suggestions } = useMemo(() => {
    const a: Assessment[] = latestAssessments(readings, crewId, day).flatMap((i) => (i.assessment ? [i.assessment] : []));
    const ids = recentSymptomIds(logs, crewId, day);
    const s: string[] = [];
    for (const x of a) if (x.status !== 'ok') s.push(`Why is my ${INDICATOR_LABELS[x.indicator].toLowerCase()} ${x.status === 'watch' ? 'amber' : 'red'}?`);
    for (const id of ids) {
      const label = symptomById(id)?.label;
      if (label && cardsFor([], [id]).length) s.push(`What should I do about ${label.toLowerCase()}?`);
    }
    if (s.length === 0) s.push('How is my health today?');
    return { assessments: a, suggestions: s.slice(0, 3) };
  }, [readings, logs, crewId, day]);

  const act = assessments.some((a) => a.status === 'act') || [...chat].reverse().find((m) => m.role === 'assistant')?.escalate === true;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [chat.length, sending]);

  const send = (q: string) => {
    if (!q.trim() || sending) return;
    setText('');
    void sendCoachMessage(q);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(text);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="text-[28px] font-semibold text-slate-50">Coach</h1>
      <p className="text-base text-slate-400">Answers only from Dalil's guidance cards, with sources. Not a medical device. It never diagnoses.</p>

      {act && (
        <Button variant="danger" big onClick={() => go('earth')} className="self-start">
          <TriangleAlert aria-hidden size={22} /> Contact flight surgeon
        </Button>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Suggested questions">
          {suggestions.map((s) => (
            <button key={s} type="button" disabled={sending} onClick={() => send(s)} className="rounded-full border border-contrast/20 px-3 py-1.5 text-base text-slate-200 hover:bg-contrast/10 focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>

        <div className="flex min-h-48 flex-col gap-3" aria-live="polite">
          {chat.length === 0 && <p className="text-base text-slate-400">Ask a question about your readings or how you feel.</p>}
          {chat.map((m) => <Bubble key={m.id} m={m} />)}
          {sending && <p className="text-base text-slate-400">The Coach is thinking…</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="mt-4 flex gap-3 border-t border-contrast/10 pt-4">
          <label className="sr-only" htmlFor="coach-input">Ask about your health</label>
          <input
            id="coach-input"
            value={text}
            maxLength={MAX_QUESTION_CHARS}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about your health…"
            className="min-w-0 flex-1 rounded-xl border border-contrast/15 bg-space-950 px-4 py-3 text-lg text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
          />
          <Button type="submit" disabled={sending || !text.trim()}><Send aria-hidden size={20} /> Send</Button>
        </form>
      </Card>
    </div>
  );
}
