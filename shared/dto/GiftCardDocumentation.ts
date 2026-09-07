export interface GiftCardDocumentationDTO {
  documentationId: number;
  assignmentId:    number;
  value:           number;
  cardTypeId:      number;
  cardTypeName:    string;
  cardNumber:      string;
  uploadId:        number;
  amountNotSpent:  number | null;
  createdBy:       number;
  createdAt:       string;
}

export interface CreateGiftCardDocumentationDTO {
  assignmentId:   number;
  value:          number;
  cardTypeId:     number;
  cardNumber:     string;
  uploadId:       number;
  amountNotSpent?: number;
}
