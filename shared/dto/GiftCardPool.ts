export interface GiftCardPoolDTO {
  poolId:       number;
  poolCode:     string;
  poolName:     string;
  poolIsActive: boolean;
  poolCreatedAt: string;
}

export interface CreateGiftCardPoolDTO {
  poolCode: string;
  poolName: string;
}

export interface UpdateGiftCardPoolDTO {
  poolCode?: string;
  poolName?: string;
}