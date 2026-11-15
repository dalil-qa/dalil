import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({ title, action, children, className = '' }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-contrast/10 bg-space-900 p-5 ${className}`}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold text-slate-100">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type Variant = 'primary' | 'secondary' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-cyan-700 text-white hover:bg-cyan-700/80 border border-cyan-400/30',
  secondary: 'bg-transparent text-slate-100 border border-contrast/25 hover:bg-contrast/10',
  danger: 'bg-act/15 text-act border border-act hover:bg-act/25',
};

export function Button({ variant = 'primary', big = false, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; big?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 ${big ? 'min-h-14 px-7 text-lg' : 'min-h-11 px-4 text-base'} ${VARIANTS[variant]} ${className}`}
    />
  );
}
