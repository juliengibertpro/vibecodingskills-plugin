// Prototype content: exercise 01 of the new Parcours 1, "The Excuse Office".
// EN is the source, FR the translation. In the product this would be generated
// from content/<lang>/<parcours>/<exo>/ (lesson.mdx + checks.yaml), not hand-kept here.

import type { Lang } from '../types'

export type Copy = Record<Lang, string>

export type Check =
  | { type: 'file_exists'; path: string; description: Copy }
  | {
      type: 'file_contains_any'
      path: string
      patterns: string[]
      caseInsensitive?: boolean
      description: Copy
    }
  | { type: 'file_modified_since'; path: string; sinceStep: string; description: Copy }
  // Gesture checks: read what the learner did in the app, not the files.
  | { type: 'prompt_written'; minLength: number; description: Copy }
  | { type: 'tool_used'; pattern: string; isManualOk?: boolean; description: Copy }
  | { type: 'edit_refused'; description: Copy }

export type Step = {
  id: string
  title: Copy
  body: Copy
  /** What the "Put it in the chat" button writes into the message box. */
  prompt?: Copy
  /** Label of a button that validates the step's gesture by hand. */
  manual?: Copy
  checks: Check[]
  hints: [Copy, Copy, Copy]
  debrief: Copy
}

export type Exercise = {
  id: string
  course: Copy
  index: number
  total: number
  title: Copy
  steps: Step[]
  summary: Copy
}

export const EXERCISE: Exercise = {
  id: 'excuse-office/01-order-your-app',
  course: { en: 'The Excuse Office', fr: 'Le Bureau des Excuses' },
  index: 1,
  total: 12,
  title: { en: 'Order your first app', fr: 'Commande ta première appli' },
  steps: [
    {
      id: 'step-1-order',
      title: { en: 'Order your first app', fr: 'Commande ta première appli' },
      body: {
        en: "**Claude Code isn't a chatbot: it builds real things, in your folder.** Let's prove it in two minutes.\n\nClick **Put it in the chat** below: the request lands in the message box. Press **Enter** to send it.\n\nClaude will ask your permission before creating the file. Accept.",
        fr: "**Claude Code n'est pas un chatbot : il construit de vraies choses, dans ton dossier.** On le prouve en deux minutes.\n\nClique sur **Mettre dans le chat** ci-dessous : la demande arrive dans la zone de message. Appuie sur **Entrée** pour l'envoyer.\n\nClaude te demandera la permission avant de créer le fichier. Accepte.",
      },
      prompt: {
        en: 'Create an index.html page called "The Excuse Office". In the middle, a big button "Give me an excuse". Each click shows a random, absurd excuse for being late, picked from a list of 10. Make it fun, not corporate.',
        fr: "Crée une page index.html qui s'appelle « Le Bureau des Excuses ». Au centre, un gros bouton « Donne-moi une excuse ». À chaque clic, une excuse absurde pour justifier un retard s'affiche, tirée au hasard dans une liste de 10. Fais un design fun, pas corporate.",
      },
      checks: [
        {
          type: 'file_exists',
          path: 'index.html',
          description: { en: 'The file index.html exists', fr: 'Le fichier index.html existe' },
        },
        {
          type: 'file_contains_any',
          path: 'index.html',
          patterns: ['<button'],
          caseInsensitive: true,
          description: { en: 'The page has a button', fr: 'La page contient un bouton' },
        },
        {
          type: 'file_contains_any',
          path: 'index.html',
          // One word per course language: the page is written in the learner's language.
          patterns: ['excuse', 'excusa', 'desculpa', 'ausrede'],
          caseInsensitive: true,
          description: { en: 'The page talks about excuses', fr: "La page parle d'excuses" },
        },
      ],
      hints: [
        {
          en: 'The **Put it in the chat** button fills the message box at the bottom. All that is left is pressing Enter.',
          fr: 'Le bouton **Mettre dans le chat** remplit la zone de message en bas. Il ne reste qu’à appuyer sur Entrée.',
        },
        {
          en: 'Nothing happens? Look in the chat: Claude may be waiting for your permission, with a button to accept.',
          fr: 'Rien ne se passe ? Regarde dans le chat : Claude attend peut-être ta permission, avec un bouton pour accepter.',
        },
        {
          en: 'The file must be named exactly `index.html` and sit at the root of your folder. Ask Claude: "Check that index.html is at the root of the folder."',
          fr: "Le fichier doit s'appeler exactement `index.html` et être à la racine de ton dossier. Demande à Claude : « Vérifie que index.html est bien à la racine du dossier. »",
        },
      ],
      debrief: {
        en: 'You wrote an intention in plain words, and Claude created a real file in your folder. Notice that it asked first: nothing happens on your computer without your go-ahead.',
        fr: 'Tu as écrit une intention avec tes mots, et Claude a créé un vrai fichier dans ton dossier. Remarque qu’il a demandé avant : rien ne se passe sur ton ordinateur sans ton feu vert.',
      },
    },
    {
      id: 'step-2-see',
      title: { en: 'See it run', fr: 'Regarde-la tourner' },
      body: {
        en: "Your app exists, but you haven't seen it yet. Ask Claude to show it to you: a browser opens right next to the chat.\n\nThen click the button a few times. Which excuse is your favorite?",
        fr: "Ton appli existe, mais tu ne l'as pas encore vue. Demande à Claude de te la montrer : un navigateur s'ouvre juste à côté du chat.\n\nClique ensuite plusieurs fois sur le bouton. C'est quoi ton excuse préférée ?",
      },
      prompt: {
        en: 'Open index.html in the preview so I can try it.',
        fr: "Ouvre index.html dans l'aperçu pour que je puisse l'essayer.",
      },
      manual: { en: 'I can see my page', fr: 'Je vois ma page' },
      checks: [
        {
          type: 'tool_used',
          pattern: 'Claude_Browser',
          isManualOk: true,
          description: { en: 'Claude opened the preview', fr: "Claude a ouvert l'aperçu" },
        },
      ],
      hints: [
        {
          en: 'You can also open the preview yourself: **Cmd+Shift+B** on Mac.',
          fr: "Tu peux aussi ouvrir l'aperçu toi-même : **Cmd+Shift+B** sur Mac.",
        },
        {
          en: 'Blank preview? Ask: "The preview is empty, find out why."',
          fr: "Aperçu tout blanc ? Demande : « L'aperçu est vide, regarde pourquoi. »",
        },
        {
          en: 'Saw the page another way (a double-click in Finder, for example)? Click **I can see my page** below.',
          fr: 'Tu as vu la page autrement (un double-clic dans le Finder, par exemple) ? Clique sur **Je vois ma page** ci-dessous.',
        },
      ],
      debrief: {
        en: "Claude doesn't just write code: it runs your app and can even click in it to check its work. Make it a habit: always look at the result, not just the code.",
        fr: "Claude ne fait pas qu'écrire du code : il lance ton appli et peut même cliquer dedans pour vérifier son travail. Prends le réflexe : regarde toujours le résultat, pas seulement le code.",
      },
    },
    {
      id: 'step-3-funnier',
      title: { en: 'Make it funnier', fr: 'Rends-la plus drôle' },
      body: {
        en: '**Your turn: no prompt to copy this time.** Ask Claude for two things in the same message:\n\n- twice as many excuses (20 in total)\n- confetti every time you click the button\n\nWrite it your way, then look at the result in the preview.',
        fr: "**À toi de jouer : pas de prompt à copier cette fois.** Demande deux choses à Claude dans le même message :\n\n- deux fois plus d'excuses (20 en tout)\n- des confettis à chaque clic sur le bouton\n\nÉcris-le à ta façon, puis regarde le résultat dans l'aperçu.",
      },
      checks: [
        {
          type: 'prompt_written',
          minLength: 25,
          description: { en: 'You wrote your own request', fr: 'Tu as écrit ta propre demande' },
        },
        {
          type: 'file_modified_since',
          path: 'index.html',
          sinceStep: 'step-2-see',
          description: { en: 'index.html changed', fr: 'index.html a changé' },
        },
        {
          type: 'file_contains_any',
          path: 'index.html',
          patterns: ['confetti', 'confeti', 'confete', 'konfetti'],
          caseInsensitive: true,
          description: { en: 'The page throws confetti', fr: 'La page lance des confettis' },
        },
      ],
      hints: [
        {
          en: 'Be precise about both requests: how many excuses, and when the confetti appears.',
          fr: "Sois précis sur les deux demandes : combien d'excuses, et à quel moment les confettis apparaissent.",
        },
        {
          en: 'A phrasing that works: "Add 10 more excuses (20 in total) and throw confetti every time the button is clicked."',
          fr: 'Une formulation qui marche : « Ajoute 10 excuses de plus (20 en tout) et lance des confettis à chaque clic sur le bouton. »',
        },
        {
          en: 'The check looks for the word "confetti" in index.html. If Claude built the effect under another name, ask it to name the function `launchConfetti`.',
          fr: "La vérification cherche le mot « confetti » dans index.html. Si Claude a fait l'effet sous un autre nom, demande-lui d'appeler la fonction `launchConfetti`.",
        },
      ],
      debrief: {
        en: 'You wrote your first prompt yourself, with two precise constraints. The more precise you are, the less Claude has to guess. And you iterated: you rarely get it perfect on the first try, you refine.',
        fr: "Tu as écrit ton premier prompt toi-même, avec deux contraintes précises. Plus tu es précis, moins Claude devine. Et tu as itéré : on obtient rarement le résultat parfait du premier coup, on l'affine.",
      },
    },
    {
      id: 'step-4-say-no',
      title: { en: 'Say no', fr: 'Dis non' },
      body: {
        en: 'Claude always asks before touching a file. Time to use that power.\n\nSend the terrible idea below. When Claude asks for permission, look at the change it proposes, then **refuse**.',
        fr: 'Claude demande toujours avant de toucher un fichier. C’est le moment d’utiliser ce pouvoir.\n\nEnvoie l’idée affreuse ci-dessous. Quand Claude demande la permission, regarde la modification qu’il propose, puis **refuse**.',
      },
      prompt: {
        en: 'Put the whole page in Comic Sans with a blinking neon yellow background.',
        fr: 'Passe toute la page en Comic Sans avec un fond jaune fluo qui clignote.',
      },
      checks: [
        {
          type: 'edit_refused',
          description: { en: 'You refused a change', fr: 'Tu as refusé une modification' },
        },
      ],
      hints: [
        {
          en: 'No permission request? Your session may accept edits on its own. With the mode selector next to the message box, pick the mode where Claude asks before each edit, then send the request again.',
          fr: 'Pas de demande de permission ? Ta session accepte peut-être les modifications toute seule. Avec le sélecteur de mode à côté de la zone de message, choisis le mode où Claude demande avant chaque modification, puis renvoie la demande.',
        },
        {
          en: 'Too late, you accepted? Ask "Undo that change and bring back the previous design", then send the request again and refuse this time.',
          fr: 'Trop tard, tu as accepté ? Demande « Annule ce changement et remets le design d’avant », puis renvoie la demande et refuse cette fois.',
        },
        {
          en: 'Claude asked a question instead of editing? Answer "Yes, do it", then refuse when the permission request shows up.',
          fr: 'Claude a posé une question au lieu de modifier ? Réponds « Oui, fais-le », puis refuse quand la demande de permission arrive.',
        },
      ],
      debrief: {
        en: "You just used Claude Code's real safety net: nothing changes without your OK. Refusing isn't failing, it's staying in charge.",
        fr: "Tu viens d'utiliser le vrai filet de sécurité de Claude Code : rien ne change sans ton accord. Refuser, ce n'est pas échouer, c'est garder la main.",
      },
    },
  ],
  summary: {
    en: '**Your Excuse Office is up and running.** In a few minutes you learned to:\n\n- express an intention in plain words\n- look at the result, not just the code\n- iterate with precise constraints\n- say no when Claude proposes something you don\'t want\n\n**Next exercise:** a brand new look, starting from an image you drop into the chat.',
    fr: "**Ton Bureau des Excuses tourne.** En quelques minutes, tu as appris à :\n\n- exprimer une intention avec tes mots\n- regarder le résultat, pas seulement le code\n- itérer avec des contraintes précises\n- dire non quand Claude propose ce que tu ne veux pas\n\n**Prochain exo :** un tout nouveau look, à partir d'une image que tu glisses dans le chat.",
  },
}

export const UI = {
  en: {
    putInChat: 'Put it in the chat',
    check: 'Check my work',
    hint: 'Show a hint',
    hintTitle: 'Hint',
    restart: 'Restart the exercise',
    otherLang: 'Français',
    validated: 'Step validated:',
    stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
    exerciseOf: (i: number, n: number) => `Exercise ${i} of ${n}`,
    auto: 'Checked on its own each time Claude finishes answering.',
    checks: 'What gets checked',
    complete: 'Exercise complete!',
    opened: 'The lesson is open in the panel beside the chat.',
    unsafe:
      'Open an empty project folder first (not your home, Desktop or Documents folder), then type /atelier again.',
    toastStep: (i: number, n: number) => `Step ${i}/${n} validated`,
    toastDone: 'Exercise complete!',
    command: 'Open the Vibe Coding Skills lesson beside the chat',
    bigModel: (model: string) =>
      `You are on ${model}. For these exercises Sonnet is plenty and uses far less of your quota: switch it in the model menu under the message box.`,
  },
  fr: {
    putInChat: 'Mettre dans le chat',
    check: 'Vérifier',
    hint: 'Voir un indice',
    hintTitle: 'Indice',
    restart: "Recommencer l'exo",
    otherLang: 'English',
    validated: 'Étape validée :',
    stepOf: (i: number, n: number) => `Étape ${i} sur ${n}`,
    exerciseOf: (i: number, n: number) => `Exo ${i} sur ${n}`,
    auto: 'La vérification se fait toute seule à chaque fois que Claude termine sa réponse.',
    checks: 'Ce qui est vérifié',
    complete: 'Exo terminé !',
    opened: 'La leçon est ouverte dans le panneau à côté du chat.',
    unsafe:
      'Ouvre d’abord un dossier de projet vide (pas ton dossier personnel, ni le Bureau, ni Documents), puis retape /atelier.',
    toastStep: (i: number, n: number) => `Étape ${i}/${n} validée`,
    toastDone: 'Exo terminé !',
    command: 'Ouvrir la leçon Vibe Coding Skills à côté du chat',
    bigModel: (model: string) =>
      `Tu es sur ${model}. Pour ces exos, Sonnet suffit et use beaucoup moins ton quota : change-le dans le menu du modèle, sous la zone de message.`,
  },
} as const

/** Lowercase, plain quotes, single spaces: to tell a prompt the learner wrote from one the panel filled in. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[«»“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export const FILLED_PROMPTS = new Set(
  EXERCISE.steps.flatMap(step =>
    step.prompt ? [normalize(step.prompt.en), normalize(step.prompt.fr)] : [],
  ),
)
