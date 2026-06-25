import { useState, useMemo, useEffect } from 'react';
import { BookOpen, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fetchSopLibraryItems, type SopLibraryItem } from '@/lib/sop-library.api';

export function SopLibraryDialog() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SopLibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchSopLibraryItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.sliName.toLowerCase().includes(q) ||
        (item.sliCategory?.toLowerCase().includes(q) ?? false),
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, SopLibraryItem[]>();
    for (const item of filtered) {
      const key = item.sliCategory ?? 'General';
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return map;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-full hover:bg-primary/10 hover:text-primary">
          <BookOpen className="size-4" />
          <span className="sr-only">SOP Library</span>
        </Button>
      </DialogTrigger>
      <DialogContent variant="fullscreen" className="flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border mb-0">
          <div className="flex items-center gap-3">
            <BookOpen className="size-5 text-primary" />
            <DialogTitle className="text-xl">SOP Library</DialogTitle>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 max-w-sm"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No SOPs found.</p>
          )}

          {Array.from(grouped.entries()).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </h3>
              <div className="divide-y rounded-md border">
                {categoryItems.map((item) => (
                  <a
                    key={item.sliId}
                    href={item.sliGoogleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{item.sliName}</span>
                    <ExternalLink className="size-4 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
