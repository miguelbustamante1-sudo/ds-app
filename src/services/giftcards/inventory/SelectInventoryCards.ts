import type { Prisma } from '@prisma/client';

export interface InventoryCard {
  gci_id:          number;
  gci_codigo:      string;
  gci_pin:         string | null;
  gci_expiracion:  Date;
}

/**
 * Selects `needed` available cards matching the requested type and value.
 * Must be called inside a prisma.$transaction — the FOR UPDATE lock prevents
 * a concurrent request from selecting the same card simultaneously.
 */
export async function selectInventoryCards(
  tx: Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  cardTypeName:    string,
  cardValueAmount: number,
  needed:          number,
): Promise<InventoryCard[]> {
  const rows = await tx.$queryRawUnsafe<InventoryCard[]>(
    `SELECT gci_id, gci_codigo, gci_pin, gci_expiracion
       FROM es.gci_gift_card_inventory
      WHERE LOWER(gci_tipo) = LOWER($1)
        AND gci_cantidad    = $2
        AND gci_assigned_id IS NULL
        AND gci_expiracion  >= (NOW() AT TIME ZONE 'America/Guatemala')::date
      ORDER BY gci_expiracion ASC
      LIMIT $3
      FOR UPDATE SKIP LOCKED`,
    cardTypeName,
    cardValueAmount,
    needed,
  );

  return rows;
}
