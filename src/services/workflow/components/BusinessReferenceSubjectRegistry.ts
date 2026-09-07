/**
 * Lets a domain declare which team member a businessReferenceId is actually
 * about, without the workflow engine knowing anything about that domain's
 * schema. Mirrors BusinessReferenceLinkRegistry.ts (same seam, different
 * question: "who is this about" vs. "how do I describe/link to it").
 */
export type BusinessReferenceSubjectResolver = (
  businessReferenceId: string,
) => Promise<number | null>;

const resolvers = new Map<string, BusinessReferenceSubjectResolver>();

/** Registers the single subject resolver for a given businessReferenceType. Call once at startup. */
export function registerBusinessReferenceSubject(
  businessReferenceType: string,
  resolver: BusinessReferenceSubjectResolver,
): void {
  resolvers.set(businessReferenceType, resolver);
}

export function getBusinessReferenceSubjectResolver(
  businessReferenceType: string,
): BusinessReferenceSubjectResolver | undefined {
  return resolvers.get(businessReferenceType);
}
