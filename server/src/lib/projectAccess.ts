import { CollabRole, PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/error'

export type ProjectAccessLevel = 'none' | 'public' | CollabRole

export interface ProjectAccessContext {
  project: any
  level: ProjectAccessLevel
  isTeamMember: boolean
  canRead: boolean
  canWrite: boolean
  canReview: boolean
  canManage: boolean
  canMerge: boolean
}

export async function getProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  userId?: string
): Promise<ProjectAccessContext> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: userId
      ? {
          collaborators: {
            where: { userId },
            select: { role: true },
            take: 1,
          },
        }
      : undefined,
  })

  if (!project) throw new AppError('Project not found', 404)

  const collaboratorRole = userId ? project.collaborators?.[0]?.role : undefined
  const level: ProjectAccessLevel =
    userId && project.ownerId === userId
      ? 'OWNER'
      : collaboratorRole || (project.isPublic ? 'public' : 'none')

  const isTeamMember = level !== 'none' && level !== 'public'
  const canRead = isTeamMember || project.isPublic
  const canWrite = level === 'OWNER' || level === 'EDITOR'
  const canReview = level === 'OWNER' || level === 'EDITOR' || level === 'REVIEWER'
  const canManage = level === 'OWNER'
  const canMerge = level === 'OWNER'

  return {
    project,
    level,
    isTeamMember,
    canRead,
    canWrite,
    canReview,
    canManage,
    canMerge,
  }
}

export async function requireProjectAccess(
  prisma: PrismaClient,
  projectId: string,
  userId: string,
  capability: keyof Pick<ProjectAccessContext, 'canRead' | 'canWrite' | 'canReview' | 'canManage' | 'canMerge'>
): Promise<ProjectAccessContext> {
  const access = await getProjectAccess(prisma, projectId, userId)
  if (access[capability]) return access

  if (capability === 'canWrite' && access.level === 'public') {
    throw new AppError(
      'External contributors cannot edit this project directly. Use Clone -> Edit -> Raise PR.',
      403
    )
  }

  throw new AppError('Insufficient permissions for this project', 403)
}
