export type Lang = 'en' | 'fr'

/** One learner's run through one exercise, in one project folder. */
export type Progress = {
  root: string
  exerciseId: string
  lang: Lang
  stepIndex: number
  /** Step id → epoch ms when the step was validated. */
  validatedAt: Record<string, number>
  /** Epoch ms when the current step started. */
  stepStartedAt: number
  /** Step id → highest hint level revealed (0 to 3). */
  hintLevel: Record<string, number>
  /** Step id → gestures seen during that step (`prompt:own`, `tool:<name>`, `edit:refused`, `manual`). */
  gestures: Record<string, string[]>
  /** Id of the step whose debrief shows above the next step. */
  lastDebrief: string | null
  completedAt: number | null
}

/** Outcome of the last evaluation of the current step, one flag per check. */
export type Results = { stepId: string; passed: boolean[] }

declare module 'claude-code' {
  interface PluginState {
    'vibe-coding-skills': {
      progress: Shaped<Progress | null>
      results: Shaped<Results | null>
      /** Permission mode of the session, as the last prompt or turn end reported it. */
      mode: string | null
      /** The panel is asking the learner to confirm a restart. */
      confirmRestart: boolean
    }
  }
}
