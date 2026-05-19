import { PrismaClient } from '@prisma/client'

export async function recalculateProjectFileStatus(
  prisma: PrismaClient,
  projectId: string,
  filePath: string
) {
  const db = prisma as any
  if (!db.projectFileStatus || !db.projectComment || !db.projectSuggestion) return null

  const [openCommentCount, resolvedCommentCount, pendingSuggestionCount, totalSuggestions] =
    await Promise.all([
      db.projectComment.count({ where: { projectId, filePath, resolved: false } }),
      db.projectComment.count({ where: { projectId, filePath, resolved: true } }),
      db.projectSuggestion.count({ where: { projectId, filePath, status: 'PENDING' } }),
      db.projectSuggestion.count({ where: { projectId, filePath } }),
    ])

  const hasAnyReviewSignal =
    openCommentCount > 0 ||
    resolvedCommentCount > 0 ||
    pendingSuggestionCount > 0 ||
    totalSuggestions > 0

  let status: 'UNREVIEWED' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED' = 'UNREVIEWED'
  if (!hasAnyReviewSignal) {
    status = 'UNREVIEWED'
  } else if (openCommentCount > 0 || pendingSuggestionCount > 0) {
    status = 'CHANGES_REQUESTED'
  } else if (resolvedCommentCount > 0 || totalSuggestions > 0) {
    status = 'APPROVED'
  } else {
    status = 'IN_REVIEW'
  }

  return db.projectFileStatus.upsert({
    where: { projectId_filePath: { projectId, filePath } },
    create: {
      projectId,
      filePath,
      status,
      openCommentCount,
      resolvedCommentCount,
      pendingSuggestionCount,
      lastReviewedAt: new Date(),
    },
    update: {
      status,
      openCommentCount,
      resolvedCommentCount,
      pendingSuggestionCount,
      lastReviewedAt: new Date(),
    },
  })
}
