import { useForm, Controller } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload/FileUpload';
import { nominationsApi } from '@/api/topPerformers/nominations';
import type { CustomerNominationPayload } from '@/api/topPerformers/nominations';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { apiGet } from '@/lib/api';

const CHANNELS = [
  { value: 'EMAIL', label: 'Correo electrónico' },
  { value: 'CHAT', label: 'Chat en vivo' },
  { value: 'CSAT', label: 'Encuesta CSAT/NPS' },
  { value: 'CALL', label: 'Llamada telefónica (transcripción)' },
  { value: 'SOCIAL', label: 'Redes sociales' },
  { value: 'OTHER', label: 'Otro' },
];

interface ActiveMember { teamMemberId: number; teamMemberNames: string; teamMemberSurnames: string; }

type CustomerFormValues = CustomerNominationPayload & { showClientName: boolean; clientName?: string };

export default function CustomerNominationPage() {
  const { toast } = useToast();
  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: members = [] } = useQuery<ActiveMember[]>({
    queryKey: ['active-team-members'],
    queryFn: () => apiGet<ActiveMember[]>('/api/team-members/active'),
  });

  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } =
    useForm<CustomerFormValues>({
      defaultValues: { showClientName: false },
    });

  const feedbackText = watch('achievementText', '');
  const showClientName = watch('showClientName');

  const memberOptions = members.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  const onSubmit = async (data: CustomerFormValues) => {
    if (!activeCycle) return;
    try {
      const payload: CustomerNominationPayload = {
        cycId: activeCycle.cycId,
        nomineeId: data.nomineeId,
        achievementText: data.achievementText,
        customerChannel: data.customerChannel,
        feedbackDate: data.feedbackDate,
        attachments: data.attachments,
      };
      await nominationsApi.createCustomer(payload);
      toast({ title: 'Feedback de cliente registrado como nominación' });
    } catch {
      toast({ title: 'Error al registrar el feedback', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <CardTitle>Voz del Cliente — Nominación</CardTitle>

          <div>
            <Label>Colaborador nominado</Label>
            <Controller
              name="nomineeId"
              control={control}
              rules={{ required: 'Selecciona un colaborador' }}
              render={({ field }) => (
                <ComboBox
                  options={memberOptions}
                  value={field.value ? String(field.value) : ''}
                  onChange={(v) => field.onChange(parseInt(v, 10))}
                  placeholder="Busca por nombre..."
                />
              )}
            />
            {errors.nomineeId && <p className="text-destructive text-sm mt-1">{errors.nomineeId.message}</p>}
          </div>

          {/* Plain textarea — FLAG-02: rich text removed intentionally */}
          <div>
            <Label>Feedback del cliente (texto original)</Label>
            <Textarea
              {...register('achievementText', {
                required: 'Requerido',
                minLength: { value: 50, message: 'Mínimo 50 caracteres' },
              })}
              placeholder="Pega aquí el texto del email, chat, encuesta o comentario exacto del cliente..."
              rows={6}
            />
            {feedbackText.length > 0 && feedbackText.length < 80 && (
              <p className="text-amber-600 text-xs mt-1">
                Este feedback es corto. Considera agregar contexto si el cliente compartió información adicional verbalmente.
              </p>
            )}
            {errors.achievementText && <p className="text-destructive text-sm mt-1">{errors.achievementText.message}</p>}
          </div>

          <div>
            <Label>Canal de origen del feedback</Label>
            <Controller
              name="customerChannel"
              control={control}
              rules={{ required: 'Selecciona un canal' }}
              render={({ field }) => (
                <ComboBox
                  options={CHANNELS}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Selecciona el canal..."
                />
              )}
            />
            {errors.customerChannel && <p className="text-destructive text-sm mt-1">{errors.customerChannel.message}</p>}
          </div>

          <div>
            <Label>Fecha en que se recibió el feedback</Label>
            <Input
              type="date"
              {...register('feedbackDate', { required: 'Requerido' })}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.feedbackDate && <p className="text-destructive text-sm mt-1">{errors.feedbackDate.message}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Controller
              name="showClientName"
              control={control}
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
            <Label>¿El cliente autorizó compartir su nombre?</Label>
          </div>
          {showClientName && (
            <Input {...register('clientName')} placeholder="Nombre del cliente (opcional)" />
          )}

          <div>
            <Label>Archivos de soporte (opcional)</Label>
            <Controller
              name="attachments"
              control={control}
              render={({ field }) => (
                <FileUpload
                  maxFiles={2}
                  value={field.value ?? []}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <Button type="button" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Registrando...' : 'Registrar nominación de cliente'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
