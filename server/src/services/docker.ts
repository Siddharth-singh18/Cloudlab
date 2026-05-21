import Docker from 'dockerode'
import path from 'path'

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' })
const IMAGE = process.env.CONTAINER_IMAGE || 'node:20-alpine'
const WORKSPACE = process.env.CONTAINER_WORKSPACE || '/workspace'

export interface ContainerInfo {
  containerId: string
  projectId: string
  previewPort: number
  status: 'starting' | 'running' | 'stopped' | 'error'
}

// In-memory registry (use Redis in production)
const containers = new Map<string, ContainerInfo>()

export async function startProjectContainer(
  projectId: string,
  storagePath: string,
  command = 'npm install && npm run dev'
): Promise<ContainerInfo> {
  // Check if already running
  const existing = containers.get(projectId)
  if (existing?.status === 'running') return existing

  const port = await getFreePort()

  const container = await docker.createContainer({
    Image: IMAGE,
    Cmd: ['sh', '-c', command],
    WorkingDir: WORKSPACE,
    ExposedPorts: { '5173/tcp': {} },
    HostConfig: {
      Binds: [`${path.resolve(storagePath)}:${WORKSPACE}`],
      PortBindings: { '5173/tcp': [{ HostPort: String(port) }] },
      Memory: 512 * 1024 * 1024,     // 512MB
      CpuPeriod: 100000,
      CpuQuota: 50000,               // 0.5 CPU
      NetworkMode: 'bridge',
      AutoRemove: false,
    },
    Labels: {
      'cloudlab.projectId': projectId,
      'cloudlab.managed': 'true',
    },
  })

  await container.start()

  const info: ContainerInfo = {
    containerId: container.id,
    projectId,
    previewPort: port,
    status: 'running',
  }
  containers.set(projectId, info)

  return info
}

export async function stopProjectContainer(projectId: string) {
  const info = containers.get(projectId)
  if (!info) return

  try {
    const container = docker.getContainer(info.containerId)
    await container.stop({ t: 5 })
    await container.remove()
  } catch { /* container may already be stopped */ }

  containers.delete(projectId)
}

export async function execInContainer(
  projectId: string,
  cmd: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const info = containers.get(projectId)
  if (!info) throw new Error(`No running container for project ${projectId}`)

  const container = docker.getContainer(info.containerId)
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
    WorkingDir: WORKSPACE,
  })

  return new Promise((resolve, reject) => {
    exec.start({ hijack: true, stdin: false }, (err, stream) => {
      if (err) return reject(err)
      let stdout = '', stderr = ''

      stream?.on('data', (chunk: Buffer) => {
        // Docker multiplexes stdout/stderr: first byte is stream type
        const type = chunk[0]
        const data = chunk.slice(8).toString()
        if (type === 1) stdout += data
        else stderr += data
      })

      stream?.on('end', async () => {
        const inspection = await exec.inspect()
        resolve({ stdout, stderr, exitCode: inspection.ExitCode || 0 })
      })

      stream?.on('error', reject)
    })
  })
}

export function getContainerInfo(projectId: string): ContainerInfo | undefined {
  return containers.get(projectId)
}

export async function pullBaseImage() {
  console.log(`[Docker] Pulling ${IMAGE}…`)
  await new Promise<void>((resolve, reject) => {
    docker.pull(IMAGE, (err: Error, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err)
      docker.modem.followProgress(stream, (err) => err ? reject(err) : resolve())
    })
  })
  console.log(`[Docker] Image ready: ${IMAGE}`)
}

async function getFreePort(): Promise<number> {
  const start = parseInt(process.env.PREVIEW_PORT_START || '4000')
  const end   = parseInt(process.env.PREVIEW_PORT_END   || '4999')
  const used  = new Set(Array.from(containers.values()).map((c) => c.previewPort))
  for (let p = start; p <= end; p++) {
    if (!used.has(p)) return p
  }
  throw new Error('No free preview ports available')
}
