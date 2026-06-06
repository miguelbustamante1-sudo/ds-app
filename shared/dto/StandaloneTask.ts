export type TaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskSource = 'INTERNAL' | 'API';

export interface StandaloneTaskDTO {
  taskId: number;
  taskTitle: string;
  taskDescription: string | null;
  taskStatus: TaskStatus;
  taskPriority: TaskPriority;
  taskDueDate: string | null;
  teamMemberId: number;
  teamMemberNames: string;
  teamMemberSurnames: string;
  taskReferenceType: string | null;
  taskReferenceId: string | null;
  taskSource: TaskSource;
  createdBy: number;
  createdDate: string;
  updatedBy: number | null;
  updatedDate: string | null;
  resolvedBy: number | null;
  resolvedDate: string | null;
  resolutionComment: string | null;
  isOverdue: boolean;
}

export interface StandaloneTaskCommentDTO {
  commentId: number;
  taskId: number;
  commentText: string;
  createdBy: number;
  createdDate: string;
}

export interface CreateStandaloneTaskDTO {
  taskTitle: string;
  taskDescription?: string | null;
  taskPriority?: TaskPriority;
  taskDueDate?: string | null;
  teamMemberId: number;
  taskReferenceType?: string | null;
  taskReferenceId?: string | null;
}

export interface ResolveStandaloneTaskDTO {
  status: 'APPROVED' | 'REJECTED';
  comment?: string | null;
}

export interface AddStandaloneTaskCommentDTO {
  commentText: string;
}
