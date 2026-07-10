import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/components/ui/toolbar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataGrid, DataGridContainer } from '@/components/ui/data-grid';
import { DataGridTable } from '@/components/ui/data-grid-table';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { apiGet, apiDelete } from '@/lib/api';
import { formatUTCDate } from '@/lib/utils';
import { Navigate } from 'react-router-dom';

interface DocSummary {
  dchDocId: string;
  dchDocName: string;
  chunkCount: number;
  createdAt: string;
}

export function KnowledgeBasePage() {
  const { canRead, canCreate, canDelete } = usePermissions();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<DocSummary | null>(null);

  if (!canRead('SopKnowledge')) {
    return <Navigate to="/" replace />;
  }

  const loadDocs = async () => {
    try {
      const result = await apiGet<DocSummary[]>('/api/sop/documents');
      setDocs(result);
    } catch {
      toast({ title: 'Error', description: 'Failed to load documents', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDocs();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/sop/upload', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
      }

      const json = (await response.json()) as { data: { chunkCount: number } };
      toast({
        title: 'Uploaded',
        description: `${file.name} ingested — ${json.data.chunkCount} chunks created.`,
      });
      void loadDocs();
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDoc) return;
    try {
      await apiDelete(`/api/sop/documents/${encodeURIComponent(deletingDoc.dchDocId)}`);
      toast({ title: 'Deleted', description: `${deletingDoc.dchDocName} removed.` });
      setDocs((prev) => prev.filter((d) => d.dchDocId !== deletingDoc.dchDocId));
    } catch {
      toast({ title: 'Error', description: 'Failed to delete document', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingDoc(null);
    }
  };

  const columns = useMemo<ColumnDef<DocSummary>[]>(
    () => [
      {
        accessorKey: 'dchDocName',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Document" />,
        cell: ({ row }) => <span className="font-medium">{row.original.dchDocName}</span>,
        size: 300,
        meta: { headerTitle: 'Document', skeleton: <Skeleton className="h-4 w-48" /> },
      },
      {
        accessorKey: 'chunkCount',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Chunks" />,
        cell: ({ row }) => row.original.chunkCount,
        size: 100,
        meta: { headerTitle: 'Chunks', skeleton: <Skeleton className="h-4 w-12" /> },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataGridColumnHeader column={column} title="Uploaded" />,
        cell: ({ row }) => formatUTCDate(row.original.createdAt),
        size: 140,
        meta: { headerTitle: 'Uploaded', skeleton: <Skeleton className="h-4 w-28" /> },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) =>
          canDelete('SopKnowledge') ? (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeletingDoc(row.original);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 size={16} className="text-destructive" />
              </Button>
            </div>
          ) : null,
        size: 60,
        meta: { headerTitle: '', skeleton: <Skeleton className="h-4 w-8" /> },
      },
    ],
    [canDelete]
  );

  const table = useReactTable({
    data: docs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="container">
      <Toolbar>
        <ToolbarHeading>
          <ToolbarPageTitle>Knowledge Base</ToolbarPageTitle>
          <ToolbarDescription>
            Upload SOP documents to make them searchable via the AI assistant.
          </ToolbarDescription>
        </ToolbarHeading>
        {canCreate('SopKnowledge') && (
          <ToolbarActions>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.docx"
              className="hidden"
              onChange={handleUpload}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload Document'}
            </Button>
          </ToolbarActions>
        )}
      </Toolbar>

      <DataGridContainer className="mt-4">
        <DataGrid
          table={table}
          recordCount={table.getFilteredRowModel().rows.length}
          isLoading={loading}
          emptyMessage="No documents uploaded yet. Upload your first SOP to get started."
        >
          <DataGridTable />
          <DataGridPagination sizes={[10, 25, 50]} />
        </DataGrid>
      </DataGridContainer>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &ldquo;{deletingDoc?.dchDocName}&rdquo; and all its
              indexed chunks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
