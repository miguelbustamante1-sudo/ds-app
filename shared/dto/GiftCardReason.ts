export interface GiftCardReasonDTO {
  reasonId:        number;
  reasonName:      string;
  reasonIsActive:  boolean;
  reasonCreatedAt: string;
}

export interface CreateGiftCardReasonDTO {
  reasonName: string;
}

export interface UpdateGiftCardReasonDTO {
  reasonName?: string;
}