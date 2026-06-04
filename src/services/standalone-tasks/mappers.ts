import type { StandaloneTask, TeamMember, User, StandaloneTaskComment } from '@prisma/client';
import type { StandaloneTaskDTO, StandaloneTaskCommentDTO } from '@shared/dto';

type TaskRow = StandaloneTask & {
  teamMember: Pick<TeamMember, 'teamMemberNames' | 'teamMemberSurnames'>;
};

type CommentRow = StandaloneTaskComment & {
  createdByUser: Pick<User, 'userName'>;
};

export const TASK_INCLUDE = {
  teamMember: { select: { teamMemberNames: true, teamMemberSurnames: true } },
} as const;

export const COMMENT_INCLUDE = {
  createdByUser: { select: { userName: true } },
} as const;

export function toTaskDTO(row: TaskRow): StandaloneTaskDTO {
  const now = new Date();
  const isOverdue =
    row.taskStatus === 'PENDING' &&
    row.taskDueDate !== null &&
    row.taskDueDate < now;

  return {
    taskId: row.taskId,
    taskTitle: row.taskTitle,
    taskDescription: row.taskDescription,
    taskStatus: row.taskStatus as StandaloneTaskDTO['taskStatus'],
    taskPriority: row.taskPriority as StandaloneTaskDTO['taskPriority'],
    taskDueDate: row.taskDueDate ? row.taskDueDate.toISOString() : null,
    teamMemberId: row.teamMemberId,
    teamMemberNames: row.teamMember.teamMemberNames,
    teamMemberSurnames: row.teamMember.teamMemberSurnames,
    taskReferenceType: row.taskReferenceType,
    taskReferenceId: row.taskReferenceId,
    taskSource: row.taskSource as StandaloneTaskDTO['taskSource'],
    createdBy: row.createdBy,
    createdDate: row.createdDate.toISOString(),
    updatedBy: row.updatedBy,
    updatedDate: row.updatedDate ? row.updatedDate.toISOString() : null,
    resolvedBy: row.resolvedBy,
    resolvedDate: row.resolvedDate ? row.resolvedDate.toISOString() : null,
    resolutionComment: row.resolutionComment,
    isOverdue,
  };
}

export function toCommentDTO(row: CommentRow): StandaloneTaskCommentDTO {
  return {
    commentId: row.commentId,
    taskId: row.taskId,
    commentText: row.commentText,
    createdBy: row.createdBy,
    createdDate: row.createdDate.toISOString(),
  };
}
