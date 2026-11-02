// A mod-side port of the check runner in packages/shared: same check types and
// semantics, read through the engine's `$.fs` since a mod has no Node.
// Gesture checks (prompt_written, tool_used, edit_refused) read what the panel
// recorded during the step. Everything stays deterministic: no model judges.

import type { Progress } from '../types'
import type { Check, Step } from './exercise'

/** The slice of `$.fs` the checks need. */
export type Fs = {
  read: (path: string) => Promise<string>
  exists: (path: string) => Promise<boolean>
  stat: (path: string) => Promise<{ kind: 'file' | 'dir' | 'other'; mtimeMs: number }>
}

export const GESTURE = {
  ownPrompt: 'prompt:own',
  editRefused: 'edit:refused',
  // Not a check: lets the panel spot a refusal step that Claude already got past.
  editAccepted: 'edit:accepted',
  manual: 'manual',
  tool: (name: string) => `tool:${name}`,
} as const

function join(root: string, path: string): string {
  return `${root.replace(/[\\/]$/, '')}/${path}`
}

async function readOrNull(fs: Fs, path: string): Promise<string | null> {
  try {
    return await fs.read(path)
  } catch {
    return null
  }
}

async function runCheck(fs: Fs, check: Check, progress: Progress, gestures: string[]): Promise<boolean> {
  switch (check.type) {
    case 'file_exists': {
      const path = join(progress.root, check.path)
      if (!(await fs.exists(path))) return false
      return (await fs.stat(path)).kind === 'file'
    }
    case 'file_contains_any': {
      const text = await readOrNull(fs, join(progress.root, check.path))
      if (text === null) return false
      const haystack = check.caseInsensitive ? text.toLowerCase() : text
      return check.patterns.some(pattern =>
        haystack.includes(check.caseInsensitive ? pattern.toLowerCase() : pattern),
      )
    }
    case 'file_modified_since': {
      const since = progress.validatedAt[check.sinceStep]
      if (since === undefined) return false
      const path = join(progress.root, check.path)
      if (!(await fs.exists(path))) return false
      return (await fs.stat(path)).mtimeMs > since
    }
    case 'prompt_written':
      return gestures.includes(GESTURE.ownPrompt)
    case 'tool_used': {
      const pattern = new RegExp(check.pattern, 'i')
      const isUsed = gestures.some(g => g.startsWith('tool:') && pattern.test(g.slice(5)))
      return isUsed || (check.isManualOk === true && gestures.includes(GESTURE.manual))
    }
    case 'edit_refused':
      return gestures.includes(GESTURE.editRefused)
  }
}

/** One flag per check of the step, in order. A check that throws counts as failed. */
export async function evaluateStep(fs: Fs, step: Step, progress: Progress): Promise<boolean[]> {
  const gestures = progress.gestures[step.id] ?? []
  const passed: boolean[] = []
  for (const check of step.checks) {
    try {
      passed.push(await runCheck(fs, check, progress, gestures))
    } catch {
      passed.push(false)
    }
  }
  return passed
}
