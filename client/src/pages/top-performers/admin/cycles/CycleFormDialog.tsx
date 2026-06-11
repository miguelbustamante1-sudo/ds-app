import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cyclesApi } from '@/api/topPerformers/cycles';
import type { CreateTpCycleDTO } from '@shared/dto/TopPerformersCycle';

interface CycleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CycleFormData {
  cycName: string;
  cycNominationsStart: string;
  cycNominationsEnd: string;
  cycVotingStart: string;
  cycVotingEnd: string;
}

export function CycleFormDialog({ open, onOpenChange, onSuccess }: CycleFormDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CycleFormData>();

  useEffect(() => {
    if (open) {
      reset({
        cycName: '',
        cycNominationsStart: '',
        cycNominationsEnd: '',
        cycVotingStart: '',
        cycVotingEnd: '',
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: CycleFormData) => {
    try {
      const payload: CreateTpCycleDTO = {
        cycName: data.cycName.trim(),
        cycNominationsStart: data.cycNominationsStart,
        cycNominationsEnd: data.cycNominationsEnd,
        cycVotingStart: data.cycVotingStart,
        cycVotingEnd: data.cycVotingEnd,
      };
      await cyclesApi.create(payload);
      toast({ title: 'Éxito', description: 'Ciclo creado exitosamente.' });
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al crear el ciclo.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Ciclo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cycName">
              Nombre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycName"
              {...register('cycName', { required: 'El nombre es requerido.' })}
            />
            {errors.cycName && (
              <p className="text-sm text-destructive">{errors.cycName.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycNominationsStart">
              Inicio Nominaciones <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycNominationsStart"
              type="datetime-local"
              {...register('cycNominationsStart', {
                required: 'La fecha de inicio de nominaciones es requerida.',
              })}
            />
            {errors.cycNominationsStart && (
              <p className="text-sm text-destructive">
                {errors.cycNominationsStart.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycNominationsEnd">
              Fin Nominaciones <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycNominationsEnd"
              type="datetime-local"
              {...register('cycNominationsEnd', {
                required: 'La fecha de fin de nominaciones es requerida.',
              })}
            />
            {errors.cycNominationsEnd && (
              <p className="text-sm text-destructive">
                {errors.cycNominationsEnd.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycVotingStart">
              Inicio Votación <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycVotingStart"
              type="datetime-local"
              {...register('cycVotingStart', {
                required: 'La fecha de inicio de votación es requerida.',
              })}
            />
            {errors.cycVotingStart && (
              <p className="text-sm text-destructive">{errors.cycVotingStart.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="cycVotingEnd">
              Fin Votación <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cycVotingEnd"
              type="datetime-local"
              {...register('cycVotingEnd', {
                required: 'La fecha de fin de votación es requerida.',
              })}
            />
            {errors.cycVotingEnd && (
              <p className="text-sm text-destructive">{errors.cycVotingEnd.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
