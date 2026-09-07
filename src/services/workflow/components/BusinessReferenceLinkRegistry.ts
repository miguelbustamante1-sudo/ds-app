export interface BusinessReferenceLink {
  url: string;
  summary: string;
}

export type BusinessReferenceLinkResolver = (
  businessReferenceId: string,
) => Promise<BusinessReferenceLink | null>;

const resolvers = new Map<string, BusinessReferenceLinkResolver>();

/** Registers the single resolver for a given businessReferenceType. Call once at startup. */
export function registerBusinessReferenceLink(
  businessReferenceType: string,
  resolver: BusinessReferenceLinkResolver,
): void {
  resolvers.set(businessReferenceType, resolver);
}

export function getBusinessReferenceLinkResolver(
  businessReferenceType: string,
): BusinessReferenceLinkResolver | undefined {
  return resolvers.get(businessReferenceType);
}
