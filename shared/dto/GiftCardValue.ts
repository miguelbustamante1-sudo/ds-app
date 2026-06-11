export interface GiftCardValueDTO {
  cardValueId:        number;
  cardValueAmount:    number;
  cardValueCurrency:  string;
  cardValueIsActive:  boolean;
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