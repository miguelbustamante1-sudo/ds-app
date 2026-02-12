/**
 * Payload Validation Component
 * Validates that a notification payload contains all required fields for its item type.
 */

export class PayloadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayloadValidationError';
  }
}

// Registry of required fields per item type
const REQUIRED_FIELDS: Record<string, string[]> = {
  'item-1': ['userName', 'title', 'text'],
  'item-2': ['userName', 'avatar', 'badgeColor', 'description', 'link', 'info', 'tags'],
  'item-3': ['userName', 'avatar', 'badgeColor', 'description', 'link', 'day', 'info'],
  'item-4': ['userName', 'avatar', 'badgeColor', 'description', 'fileSize', 'fileIcon', 'fileName', 'fileEditedTime'],
  'item-5': ['userName', 'avatar', 'badgeColor', 'description', 'day', 'link', 'info'],
  'item-6': ['userName', 'avatar', 'badgeColor', 'description', 'info', 'fileIcon', 'fileName', 'fileEditedTime'],
  'item-7': ['userName', 'avatar', 'badgeColor', 'description', 'info', 'meetingTitle', 'meetingDate', 'meetingTime', 'meetingLocation', 'meetingLink', 'projectName', 'teamName', 'attendees'],
  'item-8': ['userName', 'avatar', 'badgeColor', 'description', 'info', 'files'],
  'item-9': ['userName', 'avatar', 'badgeColor', 'description', 'link', 'info', 'tasks'],
  'item-10': ['userName', 'avatar', 'badgeColor', 'description', 'info', 'meetingMonth', 'meetingDay', 'meetingTitle', 'meetingTime', 'attendees'],
  'item-11': ['userName', 'avatar', 'badgeColor', 'description', 'info'],
  'item-12': ['userName', 'avatar', 'badgeColor', 'description', 'link', 'info', 'messageTitle', 'messageBody', 'commentCount', 'likeCount'],
  'item-13': ['userName', 'avatar', 'badgeColor', 'description', 'link', 'info', 'targetUserName', 'targetUserEmail'],
  'item-14': ['message'],
  'item-15': ['userName', 'avatar', 'badgeColor', 'description', 'info'],
  'item-16': ['userName', 'avatar', 'badgeColor', 'description', 'link', 'info'],
  'item-17': ['userName', 'avatar', 'badgeColor', 'description', 'info'],
  'item-18': ['userName', 'avatar', 'badgeColor', 'description', 'link', 'info', 'works'],
  'item-19': ['userName', 'avatar', 'badgeColor', 'description', 'info', 'statusMessage'],
  'item-20': ['userName', 'avatar', 'badgeColor', 'description', 'info'],
};

export function validatePayload(itemType: string, payload: Record<string, unknown>): void {
  const requiredFields = REQUIRED_FIELDS[itemType];

  if (!requiredFields) {
    // Item type not registered — skip validation (allows unregistered types to pass through)
    return;
  }

  const missingFields = requiredFields.filter((field) => !(field in payload));

  if (missingFields.length > 0) {
    throw new PayloadValidationError(
      `Payload for "${itemType}" is missing required fields: ${missingFields.join(', ')}`
    );
  }
}
