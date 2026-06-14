import { prisma } from '../../../db/prisma';
import { auditOrchestrator } from '../../audit/AuditOrchestrator';
import { AppError } from '../../../errors/AppError';
import { getNominationById } from '../nominations/nominationQueries';
import { callFuelIx } from '../../aiInsights/fuelixClient';

const FUELIX_MODEL = 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `You are an HR assistant specializing in employee recognition processes. Your task is to anonymize employee nominations for a fair voting process. You must preserve ALL information about the achievement while removing ANY data that could identify the nominated person.

STRICT RULES:
1. Replace ALL proper names of people with "[team member]" or "[colleague]" as appropriate.
2. Replace identifiable project names with "[project]".
3. Replace client or account names with "[client]".
4. If a team or LOB is specific enough to reveal identity, replace it with "[team]".
5. Do NOT remove numerical metrics (percentages, counts, times).
6. Do NOT change the meaning, tone, or level of detail of the achievement.
7. If the text is already anonymized or contains no identifiable data, return it unchanged.
8. Return ONLY the anonymized text, with no explanations or additional comments.
9. If the achievement depends so heavily on the name that without it the context is lost, replace the name but add the generic role in brackets: e.g. "[support agent]".`;

function serializeMetrics(
  metrics: Array<{ nmeMetricName: string; nmeMetricValue: string; nmeMetricBenchmark: string | null }>
): string {
  if (!metrics.length) return '';
  const rows = metrics.map(
    (m) => `- ${m.nmeMetricName}: ${m.nmeMetricValue}${m.nmeMetricBenchmark ? ` (goal: ${m.nmeMetricBenchmark})` : ''}`
  );
  return `\n\nMetrics:\n${rows.join('\n')}`;
}

function buildNominationText(
  achievementText: string,
  metricsText: string,
  adminExceedsRole: string | null,
  adminClientImpact: string | null
): string {
  let text = achievementText + metricsText;
  if (adminExceedsRole) text += `\n\nHow they exceeded expectations: ${adminExceedsRole}`;
  if (adminClientImpact) text += `\n\nCustomer/business impact: ${adminClientImpact}`;
  return text;
}

async function anonymizeText(nominationText: string): Promise<string> {
  const result = await callFuelIx({
    model: FUELIX_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Please anonymize the following nomination text:\n\n--- START OF NOMINATION ---\n${nominationText}\n--- END OF NOMINATION ---`,
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
