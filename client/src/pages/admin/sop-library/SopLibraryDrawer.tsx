import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ComboBox } from '@/components/ui/combobox';
import {
  createSopLibraryItem,
  updateSopLibraryItem,
  type SopLibraryItem,
  SOP_TIER_OPTIONS,
} from '@/lib/sop-library.api';

interface FormValues {
  sliName:      string;
  sliGoogleUrl: string;
  sliCategory:  string;
  sliMinTier:   number;
  sliActive:    boolean;
}

interface Props {
  open:    boolean;
  item:    SopLibraryItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function SopLibraryDrawer({ open, item, onClose, onSaved }: Props) {
  const isEdit = item !== null;

  const form = useForm<FormValues>({
    defaultValues: {
      sliName:      '',
      sliGoogleUrl: '',
      sliCategory:  '',
      sliMinTier:   1,
      sliActive:    true,
    },
  });

  useEffect(() => {
    if (open && item) {
      form.reset({
        sliName:      item.sliName,
        sliGoogleUrl: item.sliGoogleUrl,
        sliCategory:  item.sliCategory ?? '',
        sliMinTier:   item.sliMinTier,
        sliActive:    item.sliActive,
      });
    } else if (open && !item) {
      form.reset({
        sliName:      '',
        sliGoogleUrl: '',
        sliCategory:  '',
        sliMinTier:   1,
        sliActive:    true,
      });
    }
  }, [open, item, form]);

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && item) {
        await updateSopLibraryItem(item.sliId, {
          sliName:      values.sliName,
          sliGoogleUrl: values.sliGoogleUrl,
          sliCategory:  values.sliCategory || null,
          sliMinTier:   values.sliMinTier,
          sliActive:    values.sliActive,
        });
        toast.success('SOP updated');
      } else {
        await createSopLibraryItem({
          sliName:      values.sliName,
          sliGoogleUrl: values.sliGoogleUrl,
          sliCategory:  values.sliCategory || null,
          sliMinTier:   values.sliMinTier,
        });
        toast.success('SOP created');
      }
      onSaved();
    } catch {
      toast.error(isEdit ? 'Failed to update SOP' : 'Failed to create SOP');
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="p-6">
          <SheetTitle>{isEdit ? 'Edit SOP' : 'Add SOP'}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6 flex-1 overflow-y-auto">
            <FormField
              control={form.control}
              name="sliName"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Attendance Policy" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sliGoogleUrl"
              rules={{ required: 'Google Drive URL is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Drive URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://docs.google.com/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sliCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. HR, Operations" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sliMinTier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Tier</FormLabel>
                  <FormControl>
                    <ComboBox
                      options={SOP_TIER_OPTIONS.map((o) => ({
                        value: String(o.value),
                        label: o.label,
                      }))}
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                      placeholder="Select tier"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="sliActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <FormLabel className="cursor-pointer">Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 mt-auto pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving…' : isEdit ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
