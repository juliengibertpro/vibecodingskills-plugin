import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ToolCallResult } from 'claude-code'

import type { Lang, Progress } from '../types'
import { evaluateStep, type Fs, GESTURE } from './checks'
import { EXERCISE, FILLED_PROMPTS, normalize, UI } from './exercise'

const PANE = 'vibe-lesson'
// A starter folder carries this file: the lesson then opens by itself.
const MARKER = '.vibe/exercise.json'
// Never start in a folder that holds a whole life: Claude works on everything inside.
const UNSAFE_ROOT =
  /^(\/Users\/[^/]+|\/home\/[^/]+|[A-Za-z]:\\Users\\[^\\]+)([\\/](Desktop|Documents|Downloads|Bureau))?[\\/]?$/
const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])
const REFUSAL = /reject|denied|declin|refus|doesn't want|does not want/i
const DEFAULT_PROMPT_MIN = 25
const DEBUG_MAX = 40
// Permission modes in which Claude edits without asking: a refusal step cannot happen.
const NO_ASK_MODES: Record<string, string> = {
  auto: 'Auto',
  acceptEdits: 'Accept edits',
  bypassPermissions: 'Bypass',
  dontAsk: "Don't ask",
}
// Models the panel advises against for these light exercises (quota of a Pro plan).
const BIG_MODEL = /opus/i

// Bump a shape when the value's fields change: a reload then declines the old value.
const progressAtom = atom({ plugin: 'vibe-coding-skills', key: 'progress' } as const, null, {
  shape: 'progress-1',
})
const resultsAtom = atom({ plugin: 'vibe-coding-skills', key: 'results' } as const, null, {
  shape: 'results-1',
})
const modeAtom = atom({ plugin: 'vibe-coding-skills', key: 'mode' } as const, null)

type Engine = EngineInterface

const storeKey = (root: string) => `progress:${root}`
const debugKey = (root: string) => `debug:${root}`

function fsOf($: Engine): Fs {
  return {
    read: path => $.fs.read(path),
    exists: path => $.fs.exists(path),
    stat: path => $.fs.stat(path),
  }
}

async function detectLang($: Engine): Promise<Lang> {
  try {
    const value = await $.settings.read({ key: 'language' })
    return typeof value === 'string' && /^(fr|french|fran)/i.test(value) ? 'fr' : 'en'
  } catch {
    return 'en'
  }
}

function fresh(root: string, lang: Lang, now: number): Progress {
  return {
    root,
    exerciseId: EXERCISE.id,
    lang,
    stepIndex: 0,
    validatedAt: {},
    stepStartedAt: now,
    hintLevel: {},
    gestures: {},
    lastDebrief: null,
    completedAt: null,
  }
}

function isProgressFor(value: unknown, root: string): value is Progress {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Progress>
  return candidate.exerciseId === EXERCISE.id && candidate.root === root
}

async function save($: Engine, next: Progress): Promise<void> {
  await update($, progressAtom, () => next)
  await $.store.set(storeKey(next.root), next)
}

async function openPane($: Engine, lang: Lang): Promise<void> {
  await $.ui.open({ id: PANE, title: EXERCISE.course[lang] })
}

/** Records a gesture under the current step. Returns false when no exercise runs. */
async function addGesture($: Engine, gesture: string): Promise<boolean> {
  const p = await read($, progressAtom)
  const step = p && p.completedAt === null ? EXERCISE.steps[p.stepIndex] : undefined
  if (!p || !step) return false
  const seen = p.gestures[step.id] ?? []
  if (!seen.includes(gesture)) {
    await save($, { ...p, gestures: { ...p.gestures, [step.id]: [...seen, gesture] } })
  }
  return true
}

/** Runs the current step's checks; on a full pass, moves to the next step with a toast and a sound. */
async function evaluate($: Engine): Promise<void> {
  const p = await read($, progressAtom)
  const step = p && p.completedAt === null ? EXERCISE.steps[p.stepIndex] : undefined
  if (!p || !step) return

  const passed = await evaluateStep(fsOf($), step, p)
  await update($, resultsAtom, () => ({ stepId: step.id, passed }))
  if (!passed.every(Boolean)) return

  const now = await $.clock.now()
  const isLast = p.stepIndex === EXERCISE.steps.length - 1
  await save($, {
    ...p,
    stepIndex: p.stepIndex + 1,
    validatedAt: { ...p.validatedAt, [step.id]: now },
    stepStartedAt: now,
    lastDebrief: step.id,
    completedAt: isLast ? now : null,
  })
  await update($, resultsAtom, () => null)

  const L = UI[p.lang]
  $.ui.toast(isLast ? L.toastDone : L.toastStep(p.stepIndex + 1, EXERCISE.steps.length))
  void $.audio.play({ asset: isLast ? 'sounds/done.wav' : 'sounds/step.wav' }).catch(() => undefined)
}

async function rememberMode($: Engine, mode: string | undefined): Promise<void> {
  if (mode) await update($, modeAtom, () => mode)
}

function isRefused(ran: ToolCallResult): boolean {
  if (ran.deny !== undefined) return true
  if (ran.isError !== true) return false
  try {
    return REFUSAL.test(JSON.stringify(ran.result ?? '').slice(0, 2000))
  } catch {
    return false
  }
}

/** Prototype only: the last tool calls seen during an exercise, to debug a run. No content kept. */
async function logToolCall($: Engine, tool: string, ran: ToolCallResult): Promise<void> {
  const p = await read($, progressAtom)
  if (!p || p.completedAt !== null) return
  const key = debugKey(p.root)
  const previous = await $.store.get(key)
  const list = Array.isArray(previous) ? previous : []
  const entry = {
    at: await $.clock.now(),
    step: EXERCISE.steps[p.stepIndex]?.id ?? null,
    tool,
    isDenied: ran.deny !== undefined,
    isError: ran.isError === true,
  }
  await $.store.set(key, [...list, entry].slice(-DEBUG_MAX))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const lang = await detectLang($)
    await $.command.register({ name: 'atelier', description: UI[lang].command })

    const root = await $.session.root()
    const saved = await $.store.get(storeKey(root))
    if (isProgressFor(saved, root)) {
      await update($, progressAtom, () => saved)
      void openPane($, saved.lang)
    } else if (await $.fs.exists(`${root}/${MARKER}`)) {
      await save($, fresh(root, lang, await $.clock.now()))
      void openPane($, lang)
    }

    return next(e)
  })

  on('command.run', { command: 'atelier' }, async ($, e) => {
    const root = await $.session.root()
    const arg = e.args.trim().toLowerCase()
    const current = await read($, progressAtom)
    const lang: Lang =
      arg === 'fr' || arg === 'en' ? arg : (current?.lang ?? (await detectLang($)))

    if (UNSAFE_ROOT.test(root)) {
      return { text: UI[lang].unsafe }
    }
    if (!current || current.root !== root || arg === 'reset') {
      await save($, fresh(root, lang, await $.clock.now()))
      await update($, resultsAtom, () => null)
    } else if (current.lang !== lang) {
      await save($, { ...current, lang })
    }
    await openPane($, lang)

    return { text: UI[lang].opened }
  })

  // A prompt the learner wrote (not one the panel filled in) counts as their own.
  on('prompt.submit', async ($, e, next) => {
    try {
      const isTyped = e.command === undefined && e.isMeta !== true && e.origin?.kind !== 'plugin'
      const p = isTyped ? await read($, progressAtom) : null
      const step = p && p.completedAt === null ? EXERCISE.steps[p.stepIndex] : undefined
      if (step) {
        const check = step.checks.find(c => c.type === 'prompt_written')
        const min = check?.type === 'prompt_written' ? check.minLength : DEFAULT_PROMPT_MIN
        const text = normalize(e.text)
        if (text.length >= min && !FILLED_PROMPTS.has(text)) {
          await addGesture($, GESTURE.ownPrompt)
        }
      }
    } catch {
      // A gesture lost never blocks the learner's prompt.
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    try {
      await logToolCall($, e.tool, ran)
      if (/Claude_Browser/i.test(e.tool)) {
        await addGesture($, GESTURE.tool(e.tool))
      }
      if (EDIT_TOOLS.has(e.tool) && isRefused(ran) && (await addGesture($, GESTURE.editRefused))) {
        await evaluate($)
      }
    } catch {
      // Recording is best effort: the tool's result always goes through untouched.
    }

    return ran
  }).catch(($, e, next) => next(e))

  // The permission mode rides on the classic hook inputs; keep the latest one.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    await rememberMode($, e.permission_mode)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('classic.Stop', async ($, e, next) => {
    await rememberMode($, e.permission_mode)
    return next(e)
  }).catch(($, e, next) => next(e))

  // Each time Claude finishes answering, the current step is checked.
  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)
    if (e.agentId === undefined) {
      await evaluate($).catch(() => undefined)
    }

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Markdown, Text } = $.ui.resolve(e)
    const p = await read($, progressAtom)
    const results = await read($, resultsAtom)
    const model = await $.session.model().catch(() => '')
    const mode = await read($, modeAtom)

    if (!p) {
      return <Text dimColor>Type /atelier in an empty project folder to start.</Text>
    }

    const lang = p.lang
    const L = UI[lang]
    const total = EXERCISE.steps.length
    const isComplete = p.completedAt !== null
    const step = isComplete ? undefined : EXERCISE.steps[p.stepIndex]
    const debriefStep = EXERCISE.steps.find(s => s.id === p.lastDebrief)
    const hintLevel = step ? (p.hintLevel[step.id] ?? 0) : 0
    const promptText = step?.prompt?.[lang]
    const manualLabel = step?.manual?.[lang]
    const noAskMode = mode ? NO_ASK_MODES[mode] : undefined
    const needsAsk = step?.checks.some(check => check.type === 'edit_refused') === true
    const shown = step && results?.stepId === step.id ? results.passed : null
    const dots = EXERCISE.steps
      .map((_, i) => (i < p.stepIndex ? '●' : i === p.stepIndex ? '◉' : '○'))
      .join(' ')

    const restart = async () => {
      await save($, fresh(p.root, lang, await $.clock.now()))
      await update($, resultsAtom, () => null)
    }
    const switchLang = async () => {
      const latest = await read($, progressAtom)
      if (latest) await save($, { ...latest, lang: latest.lang === 'fr' ? 'en' : 'fr' })
    }
    const revealHint = async () => {
      const latest = await read($, progressAtom)
      if (!latest || !step) return
      const level = Math.min(3, (latest.hintLevel[step.id] ?? 0) + 1)
      await save($, { ...latest, hintLevel: { ...latest.hintLevel, [step.id]: level } })
    }
    const markManual = async () => {
      await addGesture($, GESTURE.manual)
      await evaluate($)
    }

    return (
      <Box flexDirection="column" gap={1} padding={1}>
        <Box flexDirection="column" gap={0}>
          <Text size="caption" dimColor>
            {EXERCISE.course[lang]} · {L.exerciseOf(EXERCISE.index, EXERCISE.total)}
          </Text>
          <Text size="title" weight="bold">
            {EXERCISE.title[lang]}
          </Text>
          <Text color="claude">
            {dots}{' '}
            <Text dimColor>{isComplete ? L.complete : L.stepOf(p.stepIndex + 1, total)}</Text>
          </Text>
        </Box>

        {BIG_MODEL.test(model) && (
          <Box padding={1} borderStyle="round" borderColor="warning">
            <Text size="footnote" color="warning">
              {L.bigModel(model)}
            </Text>
          </Box>
        )}

        {debriefStep && (
          <Box flexDirection="column" gap={0} padding={1} borderStyle="round" borderColor="success">
            <Text weight="semibold" color="success">
              ✓ {L.validated} {debriefStep.title[lang]}
            </Text>
            <Markdown text={debriefStep.debrief[lang]} />
          </Box>
        )}

        {isComplete && (
          <Box flexDirection="column" gap={1}>
            <Text size="heading" weight="bold">
              🎉 {L.complete}
            </Text>
            <Markdown text={EXERCISE.summary[lang]} />
          </Box>
        )}

        {step && (
          <Box flexDirection="column" gap={1}>
            <Text size="heading" weight="semibold">
              {step.title[lang]}
            </Text>
            <Markdown text={step.body[lang]} />

            {needsAsk && noAskMode && (
              <Box padding={1} borderStyle="round" borderColor="warning">
                <Text size="footnote" color="warning">
                  {L.noAsk(noAskMode)}
                </Text>
              </Box>
            )}

            {promptText && (
              <Box flexDirection="column" gap={0} padding={1} borderStyle="round" borderDimColor>
                <Text mono size="footnote">
                  {promptText}
                </Text>
                <Button
                  key="fill"
                  label={L.putInChat}
                  onPress={() => void $.prompt.fill({ text: promptText })}
                />
              </Box>
            )}

            <Box flexDirection="column" gap={0}>
              <Text size="footnote" weight="semibold">
                {L.checks}
              </Text>
              {step.checks.map((check, i) => {
                const isPassed = shown?.[i] === true
                const mark = shown === null ? '○' : isPassed ? '✓' : '✗'
                return (
                  <Text size="footnote" color={isPassed ? 'success' : undefined} dimColor={!isPassed}>
                    {mark} {check.description[lang]}
                  </Text>
                )
              })}
              <Text size="caption" dimColor>
                {L.auto}
              </Text>
            </Box>

            {step.hints.slice(0, hintLevel).map((hint, i) => (
              <Box flexDirection="column" gap={0} padding={1} borderStyle="round" borderColor="warning">
                <Text size="footnote" weight="semibold" color="warning">
                  {L.hintTitle} {i + 1}/3
                </Text>
                <Markdown text={hint[lang]} />
              </Box>
            ))}

            <Box flexDirection="row" gap={1} flexWrap="wrap">
              <Button key="check" label={L.check} onPress={() => void evaluate($)} />
              {hintLevel < 3 && <Button key="hint" label={L.hint} onPress={() => void revealHint()} />}
              {manualLabel && (
                <Button key="manual" label={manualLabel} onPress={() => void markManual()} />
              )}
            </Box>
          </Box>
        )}

        <Box flexDirection="row" gap={1} flexWrap="wrap">
          <Button key="restart" label={L.restart} onPress={() => void restart()} />
          <Button key="lang" label={L.otherLang} onPress={() => void switchLang()} />
        </Box>
      </Box>
    )
  })
}
