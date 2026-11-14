import { Bot, Send, TriangleAlert, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { CardView } from '../components/CardView.tsx';
import { Button, Card } from '../components/Card.tsx';
import { NO_CARD_NOTE, OFFLINE_NOTE, URGENT_NOTE, cardsByIds, sendCoachMessage } from '../coach/send.ts';
import { indicatorName, symptomTitle } from '../i18n-app.ts';
import { useT } from '../i18n.ts';
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
  const { t } = useT();
  // The fixed notes the app itself writes are shown in the chosen language; the Coach's own answers stay as written.
  const text = m.text === URGENT_NOTE ? t('urgentNote') : m.text === OFFLINE_NOTE ? t('offlineNote') : m.text === NO_CARD_NOTE ? t('noCardNote') : m.text;

  if (m.role === 'system') {
    return <p role="status" className="rounded-xl border border-act/50 bg-act/10 p-3 text-base text-act">{text}</p>;
  }
  if (m.role === 'user') {
    return (
      <div className="ms-auto flex max-w-[85%] items-start gap-2 rounded-2xl bg-cyan-700/40 p-3 text-lg text-slate-50">
        <User aria-hidden className="mt-1 shrink-0" size={18} />
        <p dir="auto">{text}</p>
      </div>
    );
  }
  return (
    <div className="flex max-w-[92%] flex-col gap-2 rounded-2xl border border-white/10 bg-space-900 p-4">
      <p className="flex items-start gap-2 text-lg text-slate-100">
        <Bot aria-hidden className="mt-1 shrink-0 text-cyan-400" size={20} />
        <span dir="auto">{text}</span>
      </p>
      {m.fallback ? (
        <div className="flex flex-col gap-3">{cards.map((c) => <CardView key={c.id} card={c} />)}</div>
      ) : (
        cards.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-400">{t('coachSources')}</span>
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
  const { lang, t } = useT();
  const ar = lang === 'ar';
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { assessments, suggestions } = useMemo(() => {
    const a: Assessment[] = latestAssessments(readings, crewId, day).flatMap((i) => (i.assessment ? [i.assessment] : []));
    const ids = recentSymptomIds(logs, crewId, day);
    const s: string[] = [];
    for (const x of a) if (x.status !== 'ok') s.push(t('suggestWhy', { name: indicatorName(x.indicator, INDICATOR_LABELS[x.indicator].toLowerCase(), ar), level: t(x.status === 'watch' ? 'levelAmber' : 'levelRed') }));
    for (const id of ids) {
      const info = symptomById(id);
      if (info && cardsFor([], [id]).length) s.push(t('suggestDo', { symptom: symptomTitle(id, info.label.toLowerCase(), ar) }));
    }
    if (s.length === 0) s.push(t('suggestGeneral'));
    return { assessments: a, suggestions: s.slice(0, 3) };
  }, [readings, logs, crewId, day, lang]); // eslint-disable-line

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
      <h1 className="text-[28px] font-semibold text-slate-50">{t('coachTitle')}</h1>
      <p className="text-base text-slate-400">{t('coachIntro')}</p>

      {act && (
        <Button variant="danger" big onClick={() => go('earth')} className="self-start">
          <TriangleAlert aria-hidden size={22} /> {t('contactSurgeon')}
        </Button>
      )}

      <Card>
        <div className="mb-4 flex flex-wrap gap-2" aria-label={t('suggestedLabel')}>
          {suggestions.map((s) => (
            <button key={s} type="button" disabled={sending} onClick={() => send(s)} className="rounded-full border border-white/20 px-3 py-1.5 text-base text-slate-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>

        <div className="flex min-h-48 flex-col gap-3" aria-live="polite">
          {chat.length === 0 && <p className="text-base text-slate-400">{t('askEmpty')}</p>}
          {chat.map((m) => <Bubble key={m.id} m={m} />)}
          {sending && <p className="text-base text-slate-400">{t('thinking')}</p>}
          <div ref={endRef} />
        </div>

        <form onSubmit={submit} className="mt-4 flex gap-3 border-t border-white/10 pt-4">
          <label className="sr-only" htmlFor="coach-input">{t('askLabel')}</label>
          <input
            id="coach-input"
            value={text}
            maxLength={MAX_QUESTION_CHARS}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('askPlaceholder')}
            className="min-w-0 flex-1 rounded-xl border border-white/15 bg-space-950 px-4 py-3 text-lg text-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-400"
          />
          <Button type="submit" disabled={sending || !text.trim()}><Send aria-hidden size={20} /> {t('send')}</Button>
        </form>
      </Card>
    </div>
  );
}
