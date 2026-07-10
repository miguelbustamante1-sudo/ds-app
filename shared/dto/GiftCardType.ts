export interface GiftCardTypeDTO {
  cardTypeId:        number;
  cardTypeName:      string;
  cardTypeIsActive:  boolean;
  cardTypeCreatedAt: string;
}

export interface CreateGiftCardTypeDTO {
  cardTypeName: string;
}

export interface UpdateGiftCardTypeDTO {
  cardTypeName?: string;
}
