import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { AppError } from '../../../errors/AppError';
import { getNominationById } from '../nominations/nominationQueries';
import { callFuelIx } from '../../aiInsights/fuelixClient';

const FUELIX_MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Eres un asistente de RRHH especializado en procesos de reconocimiento de personal. Tu tarea es anonimizar nominaciones de empleados para un proceso de votación justo. Debes preservar TODA la información sobre el logro mientras eliminas CUALQUIER dato que permita identificar a la persona nominada.

REGLAS ESTRICTAS:
1. Reemplaza TODOS los nombres propios de personas con "[colaborador]" o "[colega]" según corresponda.
2. Reemplaza nombres de proyectos identificables con "[proyecto]".
3. Reemplaza nombres de clientes o cuentas con "[cliente]".
4. Si un equipo o LOB es suficientemente específico para revelar identidad, reemplázalo con "[equipo]".
5. NO elimines métricas numéricas (porcentajes, cantidades, tiempos).
6. NO cambies el significado, el tono ni el nivel de detalle del logro.
7. Si el texto ya está anonimizado o no contiene datos identificables, devuélvelo sin cambios.
8. Devuelve SOLO el texto anonimizado, sin explicaciones ni comentarios adicionales.
9. Si el logro depende tanto del nombre que sin él pierde contexto, reemplaza el nombre pero agrega entre corchetes el rol genérico: ej. "[agente de soporte]".`;

function serializeMetrics(
  metrics: Array<{ nmeMetricName: string; nmeMetricValue: string; nmeMetricBenchmark: string | null }>
): string {
  if (!metrics.length) return '';
  const rows = metrics.map(
    (m) => `- ${m.nmeMetricName}: ${m.nmeMetricValue}${m.nmeMetricBenchmark ? ` (meta: ${m.nmeMetricBenchmark})` : ''}`
  );
  return `\n\nMétricas:\n${rows.join('\n')}`;
}

function buildNominationText(
  achievementText: string,
  metricsText: string,
  adminExceedsRole: string | null,
  adminClientImpact: string | null
): string {
  let text = achievementText + metricsText;
  if (adminExceedsRole) text += `\n\nCómo superó las expectativas: ${adminExceedsRole}`;
  if (adminClientImpact) text += `\n\nImpacto en cliente/negocio: ${adminClientImpact}`;
  return text;
}

async function anonymizeText(nominationText: string): Promise<string> {
  const result = await callFuelIx({
    model: FUELIX_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Por favor anonimiza el siguiente texto de nominación:\n\n--- INICIO DE NOMINACIÓN ---\n${nominationText}\n--- FIN DE NOMINACIÓN ---`,
      },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });
  return result.choices[0]?.message?.content?.trim() ?? '';
}

export interface AnonymizeNominationResult {
  nomId: number;
  anonymizedText: string;
  status: 'NEEDS_REVIEW';
}

export async function anonymizeNomination(
  nomId: number,
  processedBy: number,
  userEmail: string
): Promise<AnonymizeNominationResult> {
  const nomination = await getNominationById(nomId);

  if (nomination.nomAchievementText.trim().length < 30) {
    throw new AppError('Nomination text is too short to process', 400);
  }

  const metrics = await prisma.tpNominationMetric.findMany({
    where: { nomId },
    orderBy: { nmeSortOrder: 'asc' },
    select: { nmeMetricName: true, nmeMetricValue: true, nmeMetricBenchmark: true },
  });

  const metricsText = serializeMetrics(metrics);
  const fullText = buildNominationText(
    nomination.nomAchievementText,
    metricsText,
    nomination.nomAdminExceedsRole,
    nomination.nomAdminClientImpact
  );

  const before = await prisma.tpNomination.findUnique({ where: { nomId } });

  let anonymizedText: string;

  try {
    anonymizedText = await anonymizeText(fullText);
  } catch (err) {
    const updated = await prisma.tpNomination.update({
      where: { nomId },
      data: { nomAnonymizationStatus: 'NEEDS_REVIEW', nomUpdatedBy: processedBy, nomUpdatedDate: new Date() },
    });
    await auditOrchestrator.log({
      entityName: 'nom_nominations',
      entityId: String(nomId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'AI anonymization failed — marked for manual review',
    });
    throw err;
  }

  if (!anonymizedText.trim()) {
    const updated = await prisma.tpNomination.update({
      where: { nomId },
      data: { nomAnonymizationStatus: 'NEEDS_REVIEW', nomUpdatedBy: processedBy, nomUpdatedDate: new Date() },
    });
    await auditOrchestrator.log({
      entityName: 'nom_nominations',
      entityId: String(nomId),
      createdBy: userEmail,
      oldValues: before as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
      comment: 'AI anonymization returned empty response — marked for manual review',
    });
    return { nomId, anonymizedText: '', status: 'NEEDS_REVIEW' };
  }

  const updated = await prisma.tpNomination.update({
    where: { nomId },
    data: {
      nomAnonymizedText: anonymizedText,
      nomAnonymizationStatus: 'NEEDS_REVIEW',
      nomUpdatedBy: processedBy,
      nomUpdatedDate: new Date(),
    },
  });

  await auditOrchestrator.log({
    entityName: 'nom_nominations',
    entityId: String(nomId),
    createdBy: userEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: {
      ...(updated as unknown as Record<string, unknown>),
      _promptSent: fullText.slice(0, 500),
    },
    comment: 'AI anonymization processed',
  });

  return { nomId, anonymizedText, status: 'NEEDS_REVIEW' };
}

export async function approveAnonymization(
  nomId: number,
  editedText: string | null,
  approvedBy: number,
  userEmail: string
): Promise<void> {
  const before = await prisma.tpNomination.findUnique({ where: { nomId } });
  if (!before) throw new AppError('Nomination not found', 404);

  const updateData = editedText !== null
    ? { nomAnonymizedText: editedText, nomAnonymizationStatus: 'APPROVED', nomUpdatedBy: approvedBy, nomUpdatedDate: new Date() }
    : { nomAnonymizationStatus: 'APPROVED', nomUpdatedBy: approvedBy, nomUpdatedDate: new Date() };

  const updated = await prisma.tpNomination.update({
    where: { nomId },
    data: updateData,
  });

  await auditOrchestrator.log({
    entityName: 'nom_nominations',
    entityId: String(nomId),
    createdBy: userEmail,
    oldValues: before as unknown as Record<string, unknown>,
    newValues: {
      ...(updated as unknown as Record<string, unknown>),
      _manuallyEdited: editedText !== null,
    },
    comment: editedText !== null ? 'Anonymization approved with manual edits' : 'Anonymization approved as-is',
  });
}
