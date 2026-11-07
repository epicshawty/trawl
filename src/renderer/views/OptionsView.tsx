import { useMemo, useRef, useState } from 'react';
import { Search, X, SlidersHorizontal, Info, RotateCcw } from 'lucide-react';
import { FIELDS_BY_GROUP, type RegistryField } from '@shared/options';
import { useApp } from '@/store';
import { cn } from '@/lib/utils';
import { Input, Select, Switch, Textarea } from '@/components/ui/Controls';
import { Badge, SectionLabel } from '@/components/ui/Misc';
import { Tip } from '@/components/ui/Overlays';
import { Button } from '@/components/ui/Button';

function OptionRow({ field }: { field: RegistryField }) {
  const values = useApp((s) => s.values);
  const setValue = useApp((s) => s.setValue);
  const value = values[field.id];
  const changed = value !== undefined && value !== '';
  const curated = field.curated;

  const set = (next: string | boolean | undefined) => setValue(field.id, next);

  const control = (() => {
    switch (field.kind) {
      case 'switch': {
        const checked = value === true;
        const indeterminate = value === false;
        return (
          <div className="flex items-center gap-1.5">
            {indeterminate ? (
              <span className="rounded border border-rose/30 bg-rose/10 px-1 py-px text-[9px] font-semibold tracking-wide text-rose/90 uppercase">
                forced off
              </span>
            ) : null}
            {!checked && !indeterminate && field.off ? (
              <button
                type="button"
                onClick={() => set(false)}
                title={`Pass ${field.off}`}
                className="rounded border border-line px-1 py-px font-mono text-[9px] text-fg-dim opacity-0 transition-opacity group-hover:opacity-100 hover:border-rose/40 hover:text-rose"
              >
                {field.off}
              </button>
            ) : null}
            <Switch checked={checked} onCheckedChange={(next) => set(next ? true : undefined)} />
          </div>
        );
      }
      case 'select':
        return (
          <div className="w-[176px]">
            <Select
              value={typeof value === 'string' ? value : undefined}
              onValueChange={(next) => set(next)}
              options={[{ value: '', label: 'Default' }, ...(curated?.choices ?? [])]}
              placeholder="Default"
            />
          </div>
        );
      case 'multiline':
        return (
          <Textarea
            rows={2}
            value={typeof value === 'string' ? value : ''}
            placeholder={curated?.placeholder}
            onChange={(event) => set(event.target.value || undefined)}
            className="w-[260px]"
          />
        );
      default:
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            placeholder={curated?.placeholder ?? field.spec.metavar ?? ''}
            onChange={(event) => set(event.target.value || undefined)}
            className={cn('w-[196px]', field.kind === 'path' || field.kind === 'template' ? 'font-mono text-[11px]' : '')}
          />
        );
    }
  })();

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors',
        changed ? 'bg-accent/[0.055]' : 'hover:bg-white/[0.028]',
      )}
    >
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-[12px] font-medium', changed ? 'text-fg' : 'text-fg-soft')}>{field.label}</span>
          <code className="rounded border border-line bg-white/4 px-1 py-px font-mono text-[9.5px] text-fg-dim">
            {field.on}
          </code>
          {curated?.hint ? (
            <Tip label={curated.hint}>
              <Info className="size-3 cursor-help text-fg-dim/60" />
            </Tip>
          ) : null}
          {changed ? (
            <button
              type="button"
              onClick={() => set(undefined)}
              className="ml-0.5 text-fg-dim opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose"
              aria-label="Reset"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </div>
        <div className="mt-0.5 line-clamp-1 text-[10.5px] leading-relaxed text-fg-dim">{field.spec.desc}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function OptionsView() {
  const values = useApp((s) => s.values);
  const resetValues = useApp((s) => s.resetValues);
  const [query, setQuery] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const changedCount = Object.keys(values).filter((k) => !k.startsWith('__')).length;

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FIELDS_BY_GROUP.map((group) => ({
      ...group,
      fields: group.fields.filter((field) => {
        if (onlyChanged && (values[field.id] === undefined || values[field.id] === '')) return false;
        if (!needle) return true;
        return (
          field.label.toLowerCase().includes(needle) ||
          field.on.toLowerCase().includes(needle) ||
          field.spec.desc.toLowerCase().includes(needle) ||
          group.name.toLowerCase().includes(needle)
        );
      }),
    })).filter((group) => group.fields.length > 0 && (activeGroup === 'all' || group.name === activeGroup));
  }, [query, onlyChanged, values, activeGroup]);

  const totalShown = groups.reduce((n, g) => n + g.fields.length, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line px-8 pt-7 pb-3">
        <div className="mx-auto w-full max-w-[1010px]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-[21px] font-semibold tracking-[-0.025em] text-fg">Options</h1>
              <p className="mt-0.5 text-[12.5px] text-fg-dim">
                Every flag yt-dlp exposes, grouped the way yt-dlp groups them.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {changedCount > 0 ? (
                <>
                  <Badge tone="accent">{changedCount} set</Badge>
                  <Button variant="ghost" size="sm" onClick={resetValues}>
                    <RotateCcw className="size-3.5" />
                    Reset all
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-dim" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search 245 options — try “subtitle”, “cookies”, “retry”…"
                className="pl-8"
              />
            </div>
            <button
              type="button"
              onClick={() => setOnlyChanged((v) => !v)}
              className={cn(
                'h-9 rounded-lg border px-3 text-[12px] font-medium transition-all',
                onlyChanged
                  ? 'border-accent/45 bg-accent/15 text-accent-soft'
                  : 'border-line bg-white/3 text-fg-dim hover:text-fg-soft',
              )}
            >
              Changed only
            </button>
          </div>

          <div className="mt-2 flex gap-1 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,black_92%,transparent)]">
            <button
              type="button"
              onClick={() => setActiveGroup('all')}
              className={cn(
                'h-6.5 shrink-0 rounded-md border px-2 text-[11px] transition-all',
                activeGroup === 'all'
                  ? 'border-accent/40 bg-accent/12 text-accent-soft'
                  : 'border-transparent text-fg-dim hover:text-fg-soft',
              )}
            >
              All groups
            </button>
            {FIELDS_BY_GROUP.map((group) => (
              <button
                key={group.name}
                type="button"
                onClick={() => setActiveGroup(group.name === activeGroup ? 'all' : group.name)}
                className={cn(
                  'h-6.5 shrink-0 rounded-md border px-2 text-[11px] whitespace-nowrap transition-all',
                  activeGroup === group.name
                    ? 'border-accent/40 bg-accent/12 text-accent-soft'
                    : 'border-transparent text-fg-dim hover:text-fg-soft',
                )}
              >
                {group.name.replace(/ Options$/, '')}
                <span className="ml-1 text-[10px] text-fg-dim/60">{group.fields.length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1010px] px-8 py-4">
          {totalShown === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <SlidersHorizontal className="size-6 text-fg-dim/60" />
              <div className="text-[13px] text-fg-soft">Nothing matches “{query}”</div>
              <button type="button" onClick={() => { setQuery(''); setOnlyChanged(false); }} className="text-[11.5px] text-accent-soft hover:underline">
                Clear filters
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.name} className="mb-5">
                <div className="sticky top-0 z-10 -mx-2 mb-1.5 flex items-center gap-2 bg-ink/85 px-2 py-1.5 backdrop-blur">
                  <SectionLabel>{group.name}</SectionLabel>
                  <div className="h-px flex-1 bg-line" />
                  <span className="text-[10px] text-fg-dim">{group.fields.length}</span>
                </div>
                <div className="rounded-xl border border-line/70 bg-white/[0.012] p-1">
                  {group.fields.map((field) => (
                    <OptionRow key={field.id} field={field} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
