import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload/FileUpload';
import { MetricsTable } from './MetricsTable';
import { nominationsApi } from '@/api/topPerformers/nominations';
import type { AdminNominationPayload } from '@/api/topPerformers/nominations';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { apiGet } from '@/lib/api';

const TELUS_VALUES = ['Cuidado', 'Coraje', 'Confianza', 'Trabajo en equipo'];

interface DirectReport { teamMemberId: number; teamMemberNames: string; teamMemberSurnames: string; }

export default function AdminNominationPage() {
  const { toast } = useToast();
  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: reports = [] } = useQuery<DirectReport[]>({
    queryKey: ['my-reports-for-tp'],
    queryFn: () => apiGet<DirectReport[]>('/api/team-members/my-reports'),
  });

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } =
    useForm<AdminNominationPayload>({
      defaultValues: { metrics: [{ metricName: '', metricValue: '', metricBenchmark: '' }] },
      mode: 'onChange',
    });

  const reportOptions = reports.map((r) => ({
    value: String(r.teamMemberId),
    label: `${r.teamMemberNames} ${r.teamMemberSurnames}`,
  }));

  const onSubmit = async (data: AdminNominationPayload) => {
    if (!activeCycle) return;
    try {
      await nominationsApi.createAdmin({ ...data, cycId: activeCycle.cycId });
      toast({ title: 'Nominación administrativa enviada' });
    } catch {
      toast({ title: 'Error al enviar nominación', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <CardTitle>Nominación Administrativa</CardTitle>

          <div>
            <Label>Colaborador nominado</Label>
            <Controller
              name="nomineeId"
              control={control}
              rules={{ required: 'Selecciona un colaborador' }}
              render={({ field }) => (
                <ComboBox
                  options={reportOptions}
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => field.onChange(parseInt(v, 10))}
                  placeholder="Busca en tu equipo..."
                />
              )}
            />
            {errors.nomineeId && <p className="text-destructive text-sm mt-1">{errors.nomineeId.message}</p>}
          </div>

          <div>
            <Label>Descripción del logro principal</Label>
            <Textarea
              {...register('achievementText', {
                required: true,
                minLength: { value: 150, message: 'Mínimo 150 caracteres' },
                maxLength: { value: 1200, message: 'Máximo 1200 caracteres' },
              })}
              placeholder="Describe qué hizo el colaborador, en qué contexto y cuál fue el impacto..."
              rows={6}
            />
            <span className="text-xs text-muted-foreground">{watch('achievementText', '').length} / 1200</span>
            {errors.achievementText && <p className="text-destructive text-sm">{errors.achievementText.message}</p>}
          </div>

          <div>
            <Label>Métricas cuantitativas de desempeño</Label>
            <MetricsTable control={control} register={register} />
          </div>

          <div>
            <Label>¿Cómo superó las expectativas del rol?</Label>
            <Textarea
              {...register('adminExceedsRole', { required: true, minLength: 100, maxLength: 600 })}
              placeholder="Explica en qué fue más allá de su descripción de puesto..."
              rows={4}
            />
            {errors.adminExceedsRole && <p className="text-destructive text-sm">Mínimo 100 caracteres</p>}
          </div>

          <div>
            <Label>Impacto en cliente o en el negocio</Label>
            <Textarea
              {...register('adminClientImpact', { required: true, minLength: 80, maxLength: 500 })}
              rows={3}
            />
            {errors.adminClientImpact && <p className="text-destructive text-sm">Mínimo 80 caracteres</p>}
          </div>

          <div>
            <Label>Alineación con valores TELUS</Label>
            <div className="flex flex-wrap gap-3 mt-2">
              {TELUS_VALUES.map((v) => (
                <Controller
                  key={v}
                  name="valuesSelected"
                  control={control}
                  render={({ field }) => {
                    const selected: string[] = field.value ?? [];
                    return (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selected.includes(v)}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? [...selected, v] : selected.filter((s) => s !== v))
                          }
                        />
                        {v}
                      </label>
                    );
                  }}
                />
              ))}
            </div>
            <Textarea
              {...register('valuesDescription')}
              placeholder="Justifica brevemente cómo refleja cada valor marcado"
              rows={2}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Nivel de confianza en la nominación (1–5)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              1 = Buena pero no excepcional · 3 = Definitivamente merece reconocimiento · 5 = La mejor nominación del ciclo
            </p>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex flex-col items-center cursor-pointer gap-1">
                  <input
                    type="radio"
                    value={n}
                    {...register('adminConfidenceLevel', { required: true, valueAsNumber: true })}
                  />
                  <span className="text-sm">{n}</span>
                </label>
              ))}
            </div>
            {errors.adminConfidenceLevel && <p className="text-destructive text-sm">Selecciona un nivel de confianza</p>}
          </div>

          <div>
            <Label>Archivos de soporte (opcional)</Label>
            <Controller
              name="attachments"
              control={control}
              render={({ field }) => (
                <FileUpload
                  maxFiles={3}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Enviando...' : 'Enviar nominación'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
