# Form Patterns

## Single Rule
**All forms must use `react-hook-form`.** No `useState` per field.

This applies to both dialog forms and inline page-embedded forms. There is no exception based on form size or complexity.

## Violation Policy
If you encounter an existing form that uses `useState` per field instead of `react-hook-form`:
- **Do not refactor it automatically.**
- Identify it and propose the migration to the user before touching it.
- For any **new** form you write, always use `react-hook-form` regardless of form size.

Current known violations: `ExceptionSwapForm`, `SupervisorSwapForm`.

---

## Two Form Shells

### 1. Dialog Form (CRUD modals — maintenance pages)

Use when the form is triggered by a button and floats over the current page.

**Shell:** `Dialog` → `DialogContent` → `DialogHeader` → `<form onSubmit={handleSubmit(onSubmit)}>`

**Props interface:**
```tsx
interface XFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: XDTO;        // undefined = create, defined = edit
  onSuccess: () => void;
}
```

**Create/edit detection:**
```tsx
const isEditing = !!record;
```

**Reset on open:**
```tsx
useEffect(() => {
  if (open) {
    reset({
      fieldA: record?.fieldA ?? '',
      fieldB: record?.fieldB?.toString() ?? '',
    });
  }
}, [open, record, reset]);
```

**Submit — self-contained, calls API directly, toasts on result:**
```tsx
const onSubmit = async (data: XFormData) => {
  try {
    if (isEditing) {
      await apiPut<XDTO, UpdateXDTO>(`/api/x/${record.id}`, { fieldA: data.fieldA.trim() });
      toast({ title: 'Success', description: 'X updated successfully' });
    } else {
      await apiPost<XDTO, CreateXDTO>('/api/x', { fieldA: data.fieldA.trim() });
      toast({ title: 'Success', description: 'X created successfully' });
    }
    onSuccess();
  } catch (error: any) {
    toast({
      title: 'Error',
      description: error.message || `Failed to ${isEditing ? 'update' : 'create'} X`,
      variant: 'destructive',
    });
  }
};
```

**Button text:**
```tsx
{isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
```

**Reference implementation:** `client/src/pages/maintenance/functional-area/form.tsx`

---

### 2. Inline Form (embedded in a page, not a dialog)

Use when the form lives directly on the page — typically above or beside a list.

**Shell:** `Card` → `CardContent` → `CardTitle` inside `CardContent` (never `CardHeader`)

**Props interface:**
```tsx
interface XFormProps {
  editingRecord: XDTO | null;   // null = create mode, defined = edit mode
  loading: boolean;             // owned by parent, covers the API call
  onSubmit: (data: CreateXDTO | UpdateXDTO) => Promise<void>;
  onCancelEdit: () => void;
}
```

**Reset on edit mode entry:**
```tsx
useEffect(() => {
  if (editingRecord) {
    reset({ fieldA: editingRecord.fieldA, fieldB: editingRecord.fieldB?.toString() ?? '' });
  } else {
    reset({ fieldA: '', fieldB: '' });
  }
}, [editingRecord, reset]);
```

**Submit — delegates to parent, does not call API directly:**
```tsx
const onSubmit = async (data: XFormData) => {
  const payload = isEditMode
    ? ({ fieldA: data.fieldA.trim() } as UpdateXDTO)
    : ({ fieldA: data.fieldA.trim() } as CreateXDTO);
  await onSubmit(payload);
  reset();
};
```

**Button text:**
```tsx
{loading
  ? isEditMode ? 'Saving…' : 'Submitting…'
  : isEditMode ? 'Save Changes' : 'Create X'}
```

---

## Shared Mechanics (Both Patterns)

### ComboBox wiring in react-hook-form
ComboBox is not a native input and cannot use `register`. Wire it with `watch` + `setValue`:

```tsx
const watchedCountryId = watch('countryId');

<ComboBox
  options={countryOptions}
  value={watchedCountryId}
  onValueChange={(value) => setValue('countryId', value)}
  placeholder="Select..."
/>
```

### Date inputs
Always use `type="date"`. Do **not** parse the value with `new Date()`.

```tsx
<Input type="date" {...register('startDate', { required: 'Date is required' })} />
```

### Required field marker
```tsx
<Label htmlFor="fieldName">
  Field Label <span className="text-destructive">*</span>
</Label>
```

### Validation errors
```tsx
{errors.fieldName && (
  <p className="text-sm text-destructive">{errors.fieldName.message}</p>
)}
```

### API and DTOs
- Use `apiGet`, `apiPost`, `apiPut` from `@/lib/api`
- Use `CreateXDTO` / `UpdateXDTO` from `@shared/dto` — never invent local payload shapes that duplicate shared DTOs

### Local form data interface
Define a local `XFormData` interface for the form fields. Convert to the correct DTO type at submit time.

```tsx
interface XFormData {
  name: string;
  countryId: string;   // string for ComboBox, converted to number at submit
}
```
