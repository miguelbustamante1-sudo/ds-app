import { useForm, Controller } from 'react-hook-form';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ComboBox } from '@/components/ui/combobox';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { nominationsApi } from '@/api/topPerformers/nominations';
import type { PeerNominationPayload } from '@/api/topPerformers/nominations';
import { cyclesApi } from '@/api/topPerformers/cycles';
import { apiGet } from '@/lib/api';

const TELUS_VALUES = ['Cuidado', 'Coraje', 'Confianza', 'Trabajo en equipo'];
const DRAFT_KEY = 'tp-peer-nomination-draft';

interface ActiveMember { teamMemberId: number; teamMemberNames: string; teamMemberSurnames: string; }

export default function PeerNominationPage() {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: activeCycle } = useQuery({ queryKey: ['tp-active-cycle'], queryFn: cyclesApi.getActive });
  const { data: activeMembers = [] } = useQuery<ActiveMember[]>({
    queryKey: ['active-team-members'],
    queryFn: () => apiGet<ActiveMember[]>('/api/team-members/active'),
  });

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors, isValid } } =
    useForm<PeerNominationPayload>({ mode: 'onChange' });

  const achievementText = watch('achievementText', '');

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved) as Partial<PeerNominationPayload>;
        Object.entries(draft).forEach(([k, v]) => setValue(k as keyof PeerNominationPayload, v as never));
      } catch { /* ignore malformed draft */ }
    }
    autosaveRef.current = setInterval(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(getValues()));
    }, 30000);
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [getValues, setValue]);

  const onSubmit = async (data: PeerNominationPayload) => {
    if (!activeCycle) return;
    try {
      await nominationsApi.createPeer({ ...data, cycId: activeCycle.cycId });
      localStorage.removeItem(DRAFT_KEY);
      setSubmitted(true);
      setConfirmOpen(false);
      toast({ title: `Nominación enviada para ${activeCycle.cycName}` });
    } catch {
      toast({ title: 'Error al enviar la nominación', variant: 'destructive' });
    }
  };

  const memberOptions = activeMembers.map((m) => ({
    value: String(m.teamMemberId),
    label: `${m.teamMemberNames} ${m.teamMemberSurnames}`,
  }));

  if (submitted) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-2xl font-bold text-green-600">¡Nominación enviada!</p>
        <p className="text-muted-foreground">Tu nominación fue registrada correctamente.</p>
        <Button onClick={() => setSubmitted(false)}>Enviar otra nominación</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-5">
          <CardTitle>Nominar a un Par</CardTitle>

          <div>
            <Label>¿A quién deseas nominar?</Label>
            <Controller
              name="nomineeId"
              control={control}
              rules={{ required: 'Selecciona un nominado' }}
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

          <div>
            <Label>¿Qué hizo esta persona para merecer ser Top Performer?</Label>
            <Textarea
              {...register('achievementText', {
                required: 'Requerido',
                minLength: { value: 80, message: 'Mínimo 80 caracteres' },
                maxLength: { value: 800, message: 'Máximo 800 caracteres' },
              })}
              placeholder="Describe el logro, situación o contribución específica que observaste..."
              rows={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              {errors.achievementText && <p className="text-destructive">{errors.achievementText.message}</p>}
              <span className="ml-auto">{achievementText.length} / 800</span>
            </div>
            {achievementText.length > 0 && achievementText.length < 80 && (
              <p className="text-amber-600 text-xs mt-1">
                Consejo: agrega más detalle para fortalecer la nominación.
              </p>
            )}
          </div>

          <div>
            <Label>¿Tienes algún dato cuantitativo? (opcional)</Label>
            <Textarea
              {...register('quantitativeData')}
              placeholder="Ej. Logró un CSAT del 95% ese mes, o resolvió 40 tickets en un día."
              rows={2}
            />
          </div>

          <div>
            <Label>¿Cómo refleja este logro los valores de TELUS? (opcional)</Label>
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
              placeholder="Describe brevemente cómo refleja estos valores (opcional, máx 200 chars)"
              maxLength={200}
              rows={2}
              className="mt-2"
            />
          </div>

          <div>
            <Label>¿Cuál es tu relación con el nominado?</Label>
            <Controller
              name="nominatorRelationship"
              control={control}
              rules={{ required: 'Selecciona una opción' }}
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="mt-2 space-y-1">
                  {[
                    { value: 'SAME_TEAM', label: 'Mismo equipo / LOB' },
                    { value: 'OTHER_TEAM', label: 'Otro equipo / LOB' },
                    { value: 'PROJECT', label: 'Interacción por proyecto puntual' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={opt.value} />
                      {opt.label}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.nominatorRelationship && (
              <p className="text-destructive text-sm mt-1">{errors.nominatorRelationship.message}</p>
            )}
          </div>

          <Button
            type="button"
            disabled={!isValid}
            onClick={() => setConfirmOpen(true)}
            className="w-full"
          >
            Revisar y enviar nominación
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar nominación</DialogTitle></DialogHeader>
          <div className="text-sm space-y-2 max-h-60 overflow-y-auto">
            <p><strong>Logro:</strong> {watch('achievementText')}</p>
            {watch('quantitativeData') && <p><strong>Métricas:</strong> {watch('quantitativeData')}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Editar</Button>
            <Button onClick={handleSubmit(onSubmit)}>Confirmar y enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
