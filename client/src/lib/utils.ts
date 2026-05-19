import { formatDistanceToNow } from 'date-fns'

export function timeAgo(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby',
    go: 'go', rs: 'rust',
    java: 'java', kt: 'kotlin',
    json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', mdx: 'markdown',
    html: 'html', css: 'css', scss: 'scss',
    sh: 'shell', bash: 'shell',
    sql: 'sql', graphql: 'graphql',
    dockerfile: 'dockerfile',
  }
  return map[ext || ''] || 'plaintext'
}

export function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️',
    py: '🐍', rb: '💎', go: '🔵', rs: '🦀',
    json: '{}', md: '📝', html: '🌐',
    css: '🎨', scss: '🎨', sh: '💻',
  }
  if (name === 'package.json') return '📦'
  if (name.startsWith('.env')) return '🔒'
  if (name === 'Dockerfile') return '🐳'
  return map[ext || ''] || '📄'
}

export function clsx(...args: (string | boolean | undefined | null)[]): string {
  return args.filter(Boolean).join(' ')
}

export function shortName(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function joinPath(basePath: string, name: string): string {
  return [basePath.replace(/^\/+|\/+$/g, ''), name.replace(/^\/+/, '')]
    .filter(Boolean)
    .join('/')
}

export function getRunCommand(
  fileTree: Array<{ path: string; name: string; type: 'file' | 'folder'; children?: any[] }>,
  activeTabPath?: string | null
): string {
  const stack = [...fileTree]
  const filePaths = new Set<string>()

  while (stack.length > 0) {
    const node = stack.pop()!
    if (node.type === 'file') {
      filePaths.add(node.path)
      continue
    }
    if (node.children?.length) stack.push(...node.children)
  }

  if (activeTabPath) {
    if (activeTabPath.endsWith('.py')) return `python3 "${activeTabPath}"`
    if (activeTabPath.endsWith('.js')) return `node "${activeTabPath}"`
    if (activeTabPath.endsWith('.ts')) return `ts-node "${activeTabPath}"`
    if (activeTabPath.endsWith('.tsx')) return `ts-node "${activeTabPath}"`
    if (activeTabPath.endsWith('.sh')) return `bash "${activeTabPath}"`
  }

  if (filePaths.has('package.json')) return 'npm run dev'
  if (filePaths.has('requirements.txt')) return 'python3 main.py'
  if (filePaths.has('manage.py')) return 'python3 manage.py runserver'
  if (filePaths.has('Cargo.toml')) return 'cargo run'
  if (filePaths.has('go.mod')) return 'go run .'

  return 'ls -la'
}

export function diffLines(original: string, suggested: string): Array<{
  type: 'unchanged' | 'removed' | 'added'
  content: string
}> {
  const originalLines = original.split('\n')
  const suggestedLines = suggested.split('\n')
  const result = []

  const maxLen = Math.max(originalLines.length, suggestedLines.length)
  for (let i = 0; i < maxLen; i++) {
    if (i >= originalLines.length) {
      result.push({ type: 'added' as const, content: suggestedLines[i] })
    } else if (i >= suggestedLines.length) {
      result.push({ type: 'removed' as const, content: originalLines[i] })
    } else if (originalLines[i] !== suggestedLines[i]) {
      result.push({ type: 'removed' as const, content: originalLines[i] })
      result.push({ type: 'added' as const, content: suggestedLines[i] })
    } else {
      result.push({ type: 'unchanged' as const, content: originalLines[i] })
    }
  }
  return result
}
