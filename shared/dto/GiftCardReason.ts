export interface GiftCardReasonDTO {
  reasonId:        number;
  reasonName:      string;
  reasonIsActive:  boolean;
  reasonCreatedBy: number;
  reasonCreatedByUserName?: string | null;
  reasonCreatedAt: string;
}

export interface CreateGiftCardReasonDTO {
  reasonName: string;
}

export interface UpdateGiftCardReasonDTO {
  reasonName?: string;
}
