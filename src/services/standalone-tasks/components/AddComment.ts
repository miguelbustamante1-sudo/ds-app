import { prisma } from '../../../db/prisma';
import { AppError } from '../../../errors/AppError';
import type { AddStandaloneTaskCommentDTO, StandaloneTaskCommentDTO } from '@shared/dto';
import { COMMENT_INCLUDE, toCommentDTO } from '../mappers';

export async function addComment(
  taskId: number,
  input: AddStandaloneTaskCommentDTO,
  createdBy: number,
): Promise<StandaloneTaskCommentDTO> {
  if (!input.commentText?.trim()) throw new AppError('Comment text is required', 400);

  const task = await prisma.standaloneTask.findUnique({
    where: { taskId },
    select: { taskId: true },
  });
  if (!task) throw new AppError('Task not found', 404);

  const comment = await prisma.standaloneTaskComment.create({
    data: {
      taskId,
      commentText: input.commentText.trim(),
      createdBy,
    },
    include: COMMENT_INCLUDE,
  });

  return toCommentDTO(comment);
}

export async function getComments(taskId: number): Promise<StandaloneTaskCommentDTO[]> {
  const comments = await prisma.standaloneTaskComment.findMany({
    where: { taskId },
    orderBy: { createdDate: 'asc' },
    include: COMMENT_INCLUDE,
  });
  return comments.map(toCommentDTO);
}
