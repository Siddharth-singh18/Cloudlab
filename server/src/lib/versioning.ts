import path from 'path'
import fs from 'fs/promises'
import { PrismaClient } from '@prisma/client'
import { AppError } from '../middleware/error'

async function copyDirectory(source: string, target: string) {
  await fs.mkdir(target, { recursive: true })
  const entries = await fs.readdir(source, { withFileTypes: true })

  await Promise.all(entries.map(async (entry) => {
    if (entry.name === '.cloudlab-versions') return

    const sourcePath = path.join(source, entry.name)
    const targetPath = path.join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath)
      return
    }

    await fs.copyFile(sourcePath, targetPath)
  }))
}

export async function createProjectCheckpoint(
  prisma: PrismaClient,
  projectId: string,
  createdById: string,
  label: string,
  isAuto = false
) {
  const db = prisma as any
  if (!db.projectVersion) throw new AppError('Project versioning is not available until the database schema is updated.', 503)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { storagePath: true },
  })

  if (!project) throw new AppError('Project not found', 404)

  const snapshotRoot = path.join(project.storagePath, '..', '.cloudlab-versions', projectId)
  const snapshotPath = path.join(snapshotRoot, `${Date.now()}`)
  await copyDirectory(project.storagePath, snapshotPath)

  return db.projectVersion.create({
    data: {
      projectId,
      snapshotPath,
      label,
      createdById,
      isAuto,
    },
  })
}

export async function restoreProjectCheckpoint(
  prisma: PrismaClient,
  projectId: string,
  versionId: string,
  restoredById: string
) {
  const db = prisma as any
  if (!db.projectVersion) throw new AppError('Project versioning is not available until the database schema is updated.', 503)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { storagePath: true },
  })
  if (!project) throw new AppError('Project not found', 404)

  const version = await db.projectVersion.findFirst({
    where: { id: versionId, projectId },
  })
  if (!version) throw new AppError('Version not found', 404)

  await createProjectCheckpoint(prisma, projectId, restoredById, 'Safety snapshot before restore', false)
  await fs.rm(project.storagePath, { recursive: true, force: true })
  await copyDirectory(version.snapshotPath, project.storagePath)

  return version
}

export async function deleteProjectCheckpoint(
  prisma: PrismaClient,
  projectId: string,
  versionId: string
) {
  const db = prisma as any
  if (!db.projectVersion) throw new AppError('Project versioning is not available until the database schema is updated.', 503)

  const version = await db.projectVersion.findFirst({
    where: { id: versionId, projectId },
  })
  if (!version) throw new AppError('Version not found', 404)

  await fs.rm(version.snapshotPath, { recursive: true, force: true }).catch(() => {})
  return db.projectVersion.delete({ where: { id: versionId } })
}
