export interface GiftCardTypeDTO {
  cardTypeId:        number;
  cardTypeName:      string;
  cardTypeIsActive:  boolean;
  cardTypeCreatedBy: number;
  cardTypeCreatedByUserName?: string | null;
  cardTypeCreatedAt: string;
}

export interface CreateGiftCardTypeDTO {
  cardTypeName: string;
}

export interface UpdateGiftCardTypeDTO {
  cardTypeName?: string;
}
