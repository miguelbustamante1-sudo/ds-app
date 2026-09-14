import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { listDocuments, attachDocument, deleteDocument } from '@/api/performanceCases';
import type { CaseDocumentDTO } from '@/api/performanceCases';
import { uploadFile } from '@/api/uploads';

export function DocumentsPanel({ caseId }: { caseId: number }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<CaseDocumentDTO[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState<CaseDocumentDTO | null>(null);

  useEffect(() => {
    listDocuments(caseId).then(setDocuments);
  }, [caseId]);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const { uploadId } = await uploadFile(file);
      await attachDocument(caseId, uploadId);
      const refreshed = await listDocuments(caseId);
      setDocuments(refreshed);
      toast({ title: 'Document attached' });
    } catch (err) {
      toast({ title: 'Failed to attach document', description: String(err), variant: 'destructive' });
    } finally {
      event.target.value = '';
    }
  }

  function handleDeleteClick(doc: CaseDocumentDTO) {
    setDeletingDocument(doc);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingDocument) return;
    try {
      await deleteDocument(caseId, deletingDocument.documentId);
      const refreshed = await listDocuments(caseId);
      setDocuments(refreshed);
      toast({ title: 'Document removed' });
    } catch (err) {
      toast({ title: 'Failed to remove document', description: String(err), variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingDocument(null);
    }
  }

  return (
    <Card>
      <CardContent>
        <CardTitle>Documents</CardTitle>
        <ul className="mt-2 space-y-1">
          {documents.map((doc) => (
            <li key={doc.documentId} className="flex items-center justify-between gap-2">
              <span>{doc.documentLabel ?? doc.originalName}</span>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(doc)}>
                <Trash2 size={16} className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
        <Button variant="outline" className="mt-2" onClick={() => fileInputRef.current?.click()}>
          Attach Document
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Any file type. Maximum 5 MB per file; no limit on the number of documents.
        </p>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "
              {deletingDocument?.documentLabel ?? deletingDocument?.originalName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
