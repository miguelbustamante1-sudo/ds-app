export interface GiftCardAssignmentDTO {
  assignmentId:           number;
  countryId:              number;
  countryName:            string;
  poolId:                 number;
  poolName:               string;
  reasonId:               number;
  reasonName:             string;
  cardTypeId:             number;
  cardTypeName:           string;
  cardValueId:            number;
  cardValueAmount:        number;
  cardValueCurrency:      string;
  assignmentAmount:       number;
  assignmentComment:      string | null;
  assignmentRecipients:   string[];
  assignmentEmailMessage: string | null;
  assignmentAuthStatus:   string;
  assignmentCreatedAt:    string;
}

export interface CreateGiftCardAssignmentDTO {
  countryId:              number;
  poolId:                 number;
  reasonId:               number;
  cardTypeId:             number;
  cardValueId:            number;
  assignmentAmount:       number;
  assignmentComment?:     string;
  assignmentRecipients:   string[];
  assignmentEmailMessage?: string;
}