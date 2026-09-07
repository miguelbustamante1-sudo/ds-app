export interface GiftCardValueDTO {
  cardValueId:        number;
  cardTypeId:         number;
  cardValueAmount:    number;
  cardValueCurrency:  string;
  cardValueIsActive:  boolean;
  cardValueCreatedBy: number;
  cardValueCreatedByUserName?: string | null;
  cardValueCreatedAt: string;
  cardTypeName:       string;
}

export interface CreateGiftCardValueDTO {
  cardTypeId:        number;
  cardValueAmount:   number;
  cardValueCurrency?: string;
}

export interface UpdateGiftCardValueDTO {
  cardValueAmount?:   number;
  cardValueCurrency?: string;
}
