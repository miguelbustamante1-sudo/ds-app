import { useState, useRef } from 'react';
import { uploadFile } from '@/api/uploads';
import { useToast } from '@/hooks/use-toast';
import { FileUploadProps, UploadedFile } from './FileUpload.types';

const DEFAULT_ACCEPT = ['application/pdf', 'image/jpeg', 'image/png'];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  maxFiles = 3,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  accept = DEFAULT_ACCEPT,
  value = [],
  onChange,
  disabled = false,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || disabled) return;
    const remaining = maxFiles - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    const uploaded: UploadedFile[] = [];

    setUploading(true);
    try {
      for (const file of toUpload) {
        if (!accept.includes(file.type)) {
          toast({ title: 'Tipo de archivo no permitido', variant: 'destructive' });
          continue;
        }
        if (file.size > maxSizeBytes) {
          toast({ title: `El archivo excede ${formatBytes(maxSizeBytes)}`, variant: 'destructive' });
          continue;
        }
        try {
          const result = await uploadFile(file);
          uploaded.push(result);
        } catch {
          toast({ title: 'Error al subir el archivo', variant: 'destructive' });
        }
      }
    } finally {
      setUploading(false);
    }

    if (uploaded.length > 0) {
      onChange?.([...value, ...uploaded]);
    }
  }

  function remove(uploadId: number): void {
    onChange?.(value.filter((f) => f.uploadId !== uploadId));
  }

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'
        }`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-muted-foreground">
          {uploading
            ? 'Subiendo...'
            : `Arrastra archivos aquí o haz clic. Máx ${maxFiles} archivos, ${formatBytes(maxSizeBytes)} c/u.`}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple
        accept={accept.join(',')}
        onChange={(e) => void handleFiles(e.target.files)}
        disabled={disabled}
      />

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((f) => (
            <li key={f.uploadId} className="flex items-center justify-between text-sm border rounded px-3 py-1">
              <span className="truncate max-w-xs">{f.uploadOriginalName}</span>
              <span className="text-muted-foreground ml-2">{formatBytes(f.uploadSizeBytes)}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(f.uploadId)}
                  className="ml-2 text-destructive hover:underline text-xs"
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
