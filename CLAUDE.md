# WizzPop — CLAUDE.md
## Master Briefing per Claude Code
### Leggi questo file integralmente prima di scrivere qualsiasi codice.

---

## 1. IDENTITÀ DEL PROGETTO

**Nome:** WizzPop  
**Tagline IT:** "Gioca. Impara. Sorprenditi."
**Tagline EN:** "The quiz that pops."  
**Genere:** Puzzle casual educativo — match-3 a cascata + quiz culturale  
**Piattaforma:** iOS + Android via React Native / Expo  
**Stato:** Da costruire da zero — obiettivo beta funzionante  
**Proprietario:** Vittorio (fondatore, non programmatore — guida con Claude Code)

### Tono e personalità
- Giocoso e irriverente come Duolingo — mai serioso o scolastico
- Energico come Candy Crush — mai lento o noioso
- Culturalmente ricco come Rome: Total War — con momenti di atmosfera cinematica
- Il giocatore impara senza accorgersene

### Target utenti (3 segmenti)
1. **Ragazzi 13-25** — competitivi, vogliono battere gli amici
2. **Famiglie** — genitori e figli che giocano insieme
3. **Adulti 30-50** — vogliono usare meglio il tempo sullo schermo

---

## 2. CORE GAME LOOP

```
Griglia 6×6 → Tap 2 celle stessa categoria → Match
→ Modale domanda (4 opzioni, 15s) → Risposta + curiosità culturale
→ Celle cascadano verso il basso (gravità) → Nuove celle dall'alto
→ Repeat fino a: 0 vite | livello completato
```

### Regole fondamentali
- **Griglia:** 6×6 = 36 celle, 5 categorie colorate
- **Match:** tap su 2 celle con la stessa emoji/categoria = match valido
- **Errore:** 2 celle diverse = -1 vita (max 3 vite per livello)
- **Gravità:** dopo ogni match le celle cadono verso il basso, nuove entrano dall'alto
- **Combo:** match consecutivi senza errori → moltiplicatore ×2, ×3, ×4, ×5 max
- **Deadlock:** se nessun match possibile → shuffle automatico con animazione
- **Stelle:** 1=completato, 2=score>60%, 3=score>90% + zero errori

---

## 3. CATEGORIE E VISUAL SYSTEM

```typescript
export const CATEGORIES = {
  geo:  { id: 'geo',  emoji: '🌍', label: 'Geografia',        bg: '#E6F1FB', text: '#0C447C' },
  sci:  { id: 'sci',  emoji: '⚗️', label: 'Scienza',          bg: '#EAF3DE', text: '#27500A' },
  art:  { id: 'art',  emoji: '🎨', label: 'Arte & Lett.',     bg: '#EEEDFE', text: '#3C3489' },
  hist: { id: 'hist', emoji: '⚔️', label: 'Storia',           bg: '#FAEEDA', text: '#633806' },
  wild: { id: 'wild', emoji: '⭐', label: 'Cultura Generale', bg: '#FBEAF0', text: '#72243E' },
} as const;
```

### Palette colori WizzPop
```typescript
export const colors = {
  primary:     '#5349B7',  // viola WizzPop
  primaryLight:'#EEEDFE',
  accent:      '#EF9F27',  // arancio combo/bonus
  background:  '#F8F7F2',  // bianco caldo
  surface:     '#FFFFFF',
  dark:        '#1A1A18',  // quasi-nero per testi
  success:     '#639922',
  error:       '#E24B4A',
  warning:     '#EF9F27',
  textPrimary: '#1A1A18',
  textSecondary:'#888780',
  textTertiary: '#B4B2A9',
};
```

---

## 4. STRUTTURA DATI TYPESCRIPT

### Tutti i tipi vanno in `types/game.ts`

```typescript
export type CategoryKey = 'geo' | 'sci' | 'art' | 'hist' | 'wild';
export type Difficulty = 1 | 2 | 3;
export type WorldKey = 'origini' | 'civilta' | 'scoperte' | 'arti' | 'futuro';
export type RankKey = 'curioso' | 'esploratore' | 'pensatore' | 'sapiente' | 'maestro' | 'illuminato';

export interface Cell {
  id: string;
  category: CategoryKey;
  emoji: string;
  matched: boolean;
  row: number;      // 0=top, 5=bottom
  col: number;      // 0=left, 5=right
  isNew?: boolean;  // true = generata dalla gravità (anima entrata dall'alto)
}

export interface Question {
  id: string;             // es. "GEO-042"
  category: CategoryKey;
  difficulty: Difficulty;
  world: WorldKey;
  text: string;
  options: string[];      // sempre 4 opzioni
  correctIndex: number;   // 0-3
  fact: string;           // curiosità mostrata dopo la risposta — IL CUORE DEL PRODOTTO
  factSource: string;
  tags: string[];
  minAge: number;
  timeLimitSeconds: number;
  translations?: Record<string, { text: string; options: string[]; fact: string }>;
}

export interface GameState {
  board: Cell[][];
  selected: [number, number] | null;
  score: number;
  lives: number;          // max 3
  combo: number;          // 1-5
  matchedPairs: number;
  errors: number;
  awaitingQuestion: boolean;
  currentQuestion: Question | null;
  lastMatchedCategory: CategoryKey | null;
  levelStartTime: number;
}

export interface LevelResult {
  stars: 1 | 2 | 3;
  bestScore: number;
  completedAt: string;
  errors: number;
}

export interface ProgressState {
  xp: number;
  rank: RankKey;
  completedLevels: Record<string, LevelResult>;
  unlockedWorlds: WorldKey[];
  badges: string[];
  streak: number;
  lastPlayedDate: string;
  settings: {
    difficulty: Difficulty;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    language: string;
  };
}

// Citazione cinematica
export interface CinematicQuote {
  era: string;
  text: string;
  author: string;
  context: string;
  world: WorldKey;
  particleColor: string;
  trigger: 'level_complete' | 'level_start' | 'season_end' | 'rank_up' | 'game_over';
}
```

---

## 5. LOGICA CORE — boardUtils.ts

```typescript
// utils/boardUtils.ts
import { Cell, CategoryKey } from '../types/game';
import { CATEGORIES } from '../data/categories';

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export function generateBoard(rows = 6, cols = 6): Cell[][] {
  let board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => createCell(r, c))
  );
  // Garantisce che non parta in deadlock
  while (isDeadlock(board)) board = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => createCell(r, c))
  );
  return board;
}

function createCell(row: number, col: number): Cell {
  const category = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
  return {
    id: `${row}-${col}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category,
    emoji: CATEGORIES[category].emoji,
    matched: false,
    row,
    col,
  };
}

export function isMatch(a: Cell, b: Cell): boolean {
  return a.category === b.category && a.id !== b.id;
}

export function applyGravity(board: Cell[][]): Cell[][] {
  const rows = board.length;
  const cols = board[0].length;
  const newBoard: Cell[][] = Array.from({ length: rows }, () => new Array(cols));

  for (let c = 0; c < cols; c++) {
    const existing: Cell[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      if (!board[r][c].matched) existing.push({ ...board[r][c] });
    }
    for (let r = rows - 1; r >= 0; r--) {
      const idx = rows - 1 - r;
      if (idx < existing.length) {
        newBoard[r][c] = { ...existing[idx], row: r, col: c, isNew: false };
      } else {
        const category = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
        newBoard[r][c] = {
          id: `new-${r}-${c}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          category,
          emoji: CATEGORIES[category].emoji,
          matched: false,
          row: r,
          col: c,
          isNew: true,
        };
      }
    }
  }
  return newBoard;
}

export function findAllPossibleMatches(board: Cell[][]): Array<[[number,number],[number,number]]> {
  const cells = board.flat().filter(c => !c.matched);
  const pairs: Array<[[number,number],[number,number]]> = [];
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (cells[i].category === cells[j].category) {
        pairs.push([[cells[i].row, cells[i].col], [cells[j].row, cells[j].col]]);
      }
    }
  }
  return pairs;
}

export function isDeadlock(board: Cell[][]): boolean {
  return findAllPossibleMatches(board).length === 0;
}

export function shuffleBoard(board: Cell[][]): Cell[][] {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const unmatched: Cell[] = [];
  const positions: Array<[number, number]> = [];
  board.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell.matched) { unmatched.push(cell); positions.push([r, c]); }
  }));
  for (let i = unmatched.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unmatched[i], unmatched[j]] = [unmatched[j], unmatched[i]];
  }
  positions.forEach(([r, c], i) => {
    newBoard[r][c] = { ...unmatched[i], row: r, col: c };
  });
  return newBoard;
}
```

---

## 6. STORE ZUSTAND — gameStore.ts

```typescript
// store/gameStore.ts
import { create } from 'zustand';
import { GameState, CategoryKey, Difficulty } from '../types/game';
import { generateBoard, isMatch, applyGravity, isDeadlock, shuffleBoard } from '../utils/boardUtils';

const SCORE_CONFIG = {
  1: { match: 50,  correct: 100, wrong: 20,  speedBonus: 0,   perfect: 200  },
  2: { match: 80,  correct: 200, wrong: 0,   speedBonus: 100, perfect: 500  },
  3: { match: 120, correct: 400, wrong: -50, speedBonus: 200, perfect: 1000 },
};

interface GameStore extends GameState {
  difficulty: Difficulty;
  initGame: (difficulty?: Difficulty) => void;
  selectCell: (row: number, col: number) => void;
  answerQuestion: (correct: boolean, timeMs: number) => void;
  getHint: () => [number,number][] | null;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  board: [],
  selected: null,
  score: 0,
  lives: 3,
  combo: 1,
  matchedPairs: 0,
  errors: 0,
  awaitingQuestion: false,
  currentQuestion: null,
  lastMatchedCategory: null,
  levelStartTime: 0,
  difficulty: 1,

  initGame: (difficulty = 1) => {
    set({
      board: generateBoard(),
      selected: null, score: 0, lives: 3, combo: 1,
      matchedPairs: 0, errors: 0, awaitingQuestion: false,
      currentQuestion: null, lastMatchedCategory: null,
      levelStartTime: Date.now(), difficulty,
    });
  },

  selectCell: (row, col) => {
    const state = get();
    if (state.awaitingQuestion || state.board[row][col].matched) return;

    if (!state.selected) { set({ selected: [row, col] }); return; }

    const [selRow, selCol] = state.selected;
    if (selRow === row && selCol === col) { set({ selected: null }); return; }

    const selectedCell = state.board[selRow][selCol];
    const targetCell = state.board[row][col];

    if (isMatch(selectedCell, targetCell)) {
      const newBoard = state.board.map(r => r.map(c => ({ ...c })));
      newBoard[row][col].matched = true;
      newBoard[selRow][selCol].matched = true;
      set({
        board: newBoard, selected: null,
        awaitingQuestion: true,
        lastMatchedCategory: targetCell.category,
        matchedPairs: state.matchedPairs + 1,
      });
    } else {
      set({ selected: null, lives: Math.max(0, state.lives - 1), combo: 1, errors: state.errors + 1 });
    }
  },

  answerQuestion: (correct, timeMs) => {
    const { score, combo, difficulty } = get();
    const cfg = SCORE_CONFIG[difficulty];
    const base = correct ? cfg.correct : cfg.wrong;
    const speed = correct && timeMs < 5000 ? cfg.speedBonus : 0;
    const total = (base + speed) * (correct ? Math.max(1, combo) : 1);
    const newCombo = correct ? Math.min(combo + 1, 5) : 1;

    let newBoard = applyGravity(get().board);
    if (isDeadlock(newBoard)) newBoard = shuffleBoard(newBoard);

    set({ score: Math.max(0, score + total), combo: newCombo, awaitingQuestion: false, currentQuestion: null, board: newBoard });
  },

  getHint: () => {
    const cells = get().board.flat().filter(c => !c.matched);
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        if (cells[i].category === cells[j].category) {
          return [[cells[i].row, cells[i].col], [cells[j].row, cells[j].col]];
        }
      }
    }
    return null;
  },

  resetGame: () => get().initGame(get().difficulty),
}));
```

---

## 7. SISTEMA CITAZIONI CINEMATICHE

Questo è un elemento fondamentale dell'identità di WizzPop — ispirato a Rome: Total War.

### Come funziona
- **Schermata a tutto schermo** su sfondo scuro con barre letterbox (cinema)
- **Testo in stagger**: era → virgolette → citazione → autore → fonte
- **Particelle animate** in background (colore diverso per ogni era)
- **Durata:** 6 secondi, skippabile con tap
- **Timer visibile** in basso
- **Audio:** traccia strumentale breve correlata all'era (rispetta modalità silenziosa)

### Trigger (quando appaiono)
- Fine di ogni livello completato con 2+ stelle
- Inizio di ogni mondo nuovo
- Fine stagione
- Nuovo rango XP raggiunto
- Dopo primo errore grave (motivazione)

### Database citazioni beta (15 per iniziare)

```typescript
// data/quotes.ts
export const CINEMATIC_QUOTES: CinematicQuote[] = [
  { era: 'Roma Antica · I sec. a.C.', text: 'Veni, vidi, vici.', author: 'Giulio Cesare', context: 'Annuncio della vittoria a Zela, 47 a.C.', world: 'civilta', particleColor: '#FF6B2B', trigger: 'level_complete' },
  { era: 'Grecia Antica · IV sec. a.C.', text: 'Il saggio non dice tutto ciò che pensa, ma pensa tutto ciò che dice.', author: 'Aristotele', context: 'Etica Nicomachea', world: 'origini', particleColor: '#4A90D9', trigger: 'level_start' },
  { era: 'Roma Imperiale · II sec. d.C.', text: 'Non sprecare quel che rimane della vita in pensieri su altre persone.', author: 'Marco Aurelio', context: 'Meditazioni, III.4', world: 'civilta', particleColor: '#D4AF37', trigger: 'level_complete' },
  { era: 'Illuminismo · 1784', text: 'Osa sapere.', author: 'Immanuel Kant', context: 'Risposta alla domanda: Che cos\'è l\'Illuminismo?', world: 'scoperte', particleColor: '#40E0D0', trigger: 'rank_up' },
  { era: 'Cina Antica · V sec. a.C.', text: 'Chi studia senza pensare perde il suo tempo. Chi pensa senza studiare si mette in pericolo.', author: 'Confucio', context: 'Dialoghi, II.15', world: 'origini', particleColor: '#E74C3C', trigger: 'level_start' },
  { era: 'Grecia Antica · V sec. a.C.', text: 'So di non sapere.', author: 'Socrate', context: 'Apologia di Socrate, Platone', world: 'origini', particleColor: '#3498DB', trigger: 'game_over' },
  { era: 'Rinascimento · XV sec.', text: 'L\'acqua è la forza trainante di tutta la natura.', author: 'Leonardo da Vinci', context: 'Taccuini — circa 1490', world: 'scoperte', particleColor: '#27AE60', trigger: 'level_complete' },
  { era: 'Roma Antica · I sec. a.C.', text: 'Dum spiro, spero.', author: 'Cicerone', context: 'Epistulae ad Atticum', world: 'civilta', particleColor: '#FF6B2B', trigger: 'game_over' },
  { era: 'Grecia Antica · IV sec. a.C.', text: 'La radice dell\'educazione è amara, ma il suo frutto è dolce.', author: 'Aristotele', context: 'Citato da Diogene Laerzio', world: 'origini', particleColor: '#9B59B6', trigger: 'season_end' },
  { era: 'Persia · XIII sec.', text: 'Ieri ero intelligente e volevo cambiare il mondo. Oggi sono saggio e cambio me stesso.', author: 'Rumi', context: 'Masnavi', world: 'arti', particleColor: '#F39C12', trigger: 'rank_up' },
  { era: 'Roma Imperiale · II sec. d.C.', text: 'Amami quando meno lo merito, perché è quando ne ho più bisogno.', author: 'Marco Aurelio', context: 'Meditazioni, VII.9', world: 'civilta', particleColor: '#D4AF37', trigger: 'game_over' },
  { era: 'Cina Antica · VI sec. a.C.', text: 'Un viaggio di mille miglia comincia con un singolo passo.', author: 'Lao Tzu', context: 'Tao Te Ching, 64', world: 'origini', particleColor: '#2ECC71', trigger: 'level_start' },
  { era: 'Grecia Antica · V sec. a.C.', text: 'Meraviglia è l\'inizio della conoscenza.', author: 'Socrate', context: 'Teeteto, Platone', world: 'origini', particleColor: '#3498DB', trigger: 'level_start' },
  { era: 'Italia · XIX sec.', text: 'Il segreto per andare avanti è cominciare.', author: 'Mark Twain', context: 'Notebook, 1902', world: 'arti', particleColor: '#E67E22', trigger: 'level_start' },
  { era: 'Roma Antica · I sec. a.C.', text: 'Fortes fortuna adiuvat.', author: 'Virgilio', context: 'Eneide, X.284', world: 'civilta', particleColor: '#C0392B', trigger: 'level_complete' },
];
```

### Componente CinematicScreen (struttura)
- Schermo a tutto schermo con `position: absolute` che copre tutto
- `useAnimatedStyle` di Reanimated per le transizioni di opacità e posizione
- Canvas o SVG per le particelle animate
- Letterbox: due rettangoli neri in alto e in basso che si restringono all'apertura

---

## 8. STRUTTURA CARTELLE COMPLETA

```
WizzPop/
├── app/                          # Expo Router
│   ├── _layout.tsx               # Root: providers, fonts, SafeArea
│   ├── index.tsx                 # HomeScreen
│   ├── (game)/
│   │   ├── _layout.tsx
│   │   ├── level/[id].tsx        # GameScreen — schermata principale
│   │   └── result.tsx            # ResultScreen — stelle e statistiche
│   └── (progress)/
│       ├── worlds.tsx            # Selezione mondo e livelli
│       └── profile.tsx           # XP, badge, ranking
│
├── components/
│   ├── game/
│   │   ├── GameGrid.tsx          # Griglia 6×6
│   │   ├── Cell.tsx              # Cella singola con animazioni
│   │   ├── QuestionModal.tsx     # Bottom sheet domanda
│   │   ├── AnswerOption.tsx      # Singola opzione risposta
│   │   ├── ScoreBar.tsx          # Header punteggio/vite/combo
│   │   └── CinematicScreen.tsx  # ← IMPORTANTE: citazioni cinematiche
│   └── ui/
│       ├── Button.tsx
│       ├── ProgressBar.tsx
│       └── StarRating.tsx
│
├── store/
│   ├── gameStore.ts              # Zustand stato partita
│   ├── progressStore.ts          # XP, livelli, persistenza
│   └── settingsStore.ts          # Lingua, suono, difficoltà
│
├── hooks/
│   ├── useQuestions.ts           # Selezione domande per categoria
│   ├── useHaptics.ts             # Feedback aptico
│   └── useCinematic.ts          # Gestione citazioni cinematiche
│
├── data/
│   ├── questions/
│   │   ├── index.ts
│   │   ├── geografia.json        # 3 domande test → poi 480
│   │   ├── scienza.json
│   │   ├── storia.json
│   │   ├── arte.json
│   │   └── wild.json
│   ├── quotes.ts                 # 15 citazioni cinematiche
│   ├── worlds.ts                 # Config mondi e livelli
│   └── categories.ts             # Config categorie
│
├── utils/
│   ├── boardUtils.ts             # Logica griglia (già scritta sopra)
│   ├── scoring.ts                # Calcolo punteggi
│   └── questionSelector.ts      # Selezione senza ripetizioni
│
├── theme/
│   ├── colors.ts                 # Palette WizzPop
│   └── typography.ts             # Font e scale
│
├── assets/
│   ├── sounds/                   # SFX e musica ambientale
│   └── images/                   # Icona e splash
│
└── CLAUDE.md                     # ← Questo file
```

---

## 9. DIPENDENZE DA INSTALLARE

```bash
npx create-expo-app WizzPop --template blank-typescript
cd WizzPop

npx expo install expo-router
npx expo install react-native-reanimated react-native-gesture-handler
npm install zustand
npx expo install expo-haptics expo-av expo-linear-gradient
npx expo install @react-native-async-storage/async-storage
npm install uuid
```

---

## 10. DOMANDE DI TEST PER LA BETA (3 per categoria)

```json
[
  { "id": "GEO-001", "category": "geo", "difficulty": 1, "world": "origini", "text": "Qual è il paese più grande del mondo per superficie?", "options": ["Canada", "Russia", "Cina", "USA"], "correctIndex": 1, "fact": "La Russia copre 17,1 milioni di km² — più del doppio del Canada. Si estende su 11 fusi orari.", "factSource": "CIA World Factbook", "tags": ["paesi", "record"], "minAge": 6, "timeLimitSeconds": 15 },
  { "id": "GEO-002", "category": "geo", "difficulty": 1, "world": "origini", "text": "Qual è il fiume più lungo del mondo?", "options": ["Amazzonia", "Nilo", "Mississippi", "Congo"], "correctIndex": 1, "fact": "Il Nilo si estende per 6.650 km attraversando 11 paesi africani. La sua inondazione annuale rese possibile la civiltà egizia.", "factSource": "National Geographic", "tags": ["fiumi", "africa"], "minAge": 8, "timeLimitSeconds": 15 },
  { "id": "GEO-003", "category": "geo", "difficulty": 2, "world": "civilta", "text": "In quale continente si trova il deserto più grande del mondo?", "options": ["Africa", "Asia", "Antartide", "Australia"], "correctIndex": 2, "fact": "Il deserto più grande è quello antartico (14,2 milioni di km²). Il Sahara è il più grande deserto caldo — la distinzione conta!", "factSource": "Britannica", "tags": ["deserti", "record", "antartide"], "minAge": 10, "timeLimitSeconds": 20 },

  { "id": "SCI-001", "category": "sci", "difficulty": 1, "world": "origini", "text": "Quanti pianeti ha il sistema solare?", "options": ["7", "8", "9", "10"], "correctIndex": 1, "fact": "Dal 2006 Plutone è un 'pianeta nano'. I pianeti ufficiali sono 8, da Mercurio a Nettuno. Prima della declassificazione erano 9.", "factSource": "IAU", "tags": ["spazio", "sistema solare"], "minAge": 6, "timeLimitSeconds": 15 },
  { "id": "SCI-002", "category": "sci", "difficulty": 1, "world": "origini", "text": "Qual è l'elemento chimico più abbondante nell'universo?", "options": ["Ossigeno", "Carbonio", "Idrogeno", "Elio"], "correctIndex": 2, "fact": "L'idrogeno costituisce circa il 75% della massa visibile dell'universo. Le stelle, incluso il sole, bruciano idrogeno.", "factSource": "NASA", "tags": ["chimica", "universo", "elementi"], "minAge": 10, "timeLimitSeconds": 20 },
  { "id": "SCI-003", "category": "sci", "difficulty": 2, "world": "scoperte", "text": "In quale anno fu scoperta la penicillina?", "options": ["1895", "1908", "1928", "1945"], "correctIndex": 2, "fact": "Alexander Fleming la scoprì per caso nel 1928 notando che una muffa uccideva i batteri attorno a sé. Ha salvato centinaia di milioni di vite.", "factSource": "Nobel Prize", "tags": ["medicina", "scoperte", "XX secolo"], "minAge": 12, "timeLimitSeconds": 20 },

  { "id": "HIST-001", "category": "hist", "difficulty": 1, "world": "civilta", "text": "In quale anno cadde il Muro di Berlino?", "options": ["1987", "1989", "1991", "1993"], "correctIndex": 1, "fact": "Il 9 novembre 1989 i berlinesi iniziarono ad abbattere il muro che divideva la città dal 1961. Quel giorno cambiò la storia d'Europa.", "factSource": "Bundesarchiv", "tags": ["guerra fredda", "Europa", "XX secolo"], "minAge": 12, "timeLimitSeconds": 20 },
  { "id": "HIST-002", "category": "hist", "difficulty": 1, "world": "civilta", "text": "Chi fu il primo uomo a camminare sulla Luna?", "options": ["Buzz Aldrin", "Yuri Gagarin", "Neil Armstrong", "John Glenn"], "correctIndex": 2, "fact": "Neil Armstrong posò piede sul suolo lunare il 20 luglio 1969. Le sue prime parole: 'Un piccolo passo per l'uomo, un grande balzo per l'umanità.'", "factSource": "NASA", "tags": ["spazio", "XX secolo", "USA"], "minAge": 8, "timeLimitSeconds": 15 },
  { "id": "HIST-003", "category": "hist", "difficulty": 2, "world": "civilta", "text": "In quale città fu firmata la Magna Carta?", "options": ["Londra", "Canterbury", "Runnymede", "Oxford"], "correctIndex": 2, "fact": "La Magna Carta fu firmata a Runnymede nel 1215. Non era una città ma un prato sul Tamigi — il primo documento a limitare il potere del re.", "factSource": "British Library", "tags": ["medioevo", "diritto", "Inghilterra"], "minAge": 13, "timeLimitSeconds": 20 },

  { "id": "ART-001", "category": "art", "difficulty": 1, "world": "arti", "text": "Chi dipinse la Cappella Sistina?", "options": ["Leonardo", "Raffaello", "Michelangelo", "Botticelli"], "correctIndex": 2, "fact": "Michelangelo completò il soffitto tra il 1508 e il 1512 lavorando sdraiato su ponteggi. Diceva di odiare la pittura — era uno scultore.", "factSource": "Musei Vaticani", "tags": ["Rinascimento", "pittura", "Roma"], "minAge": 8, "timeLimitSeconds": 15 },
  { "id": "ART-002", "category": "art", "difficulty": 1, "world": "arti", "text": "In quale paese nacque Mozart?", "options": ["Germania", "Austria", "Italia", "Francia"], "correctIndex": 1, "fact": "Wolfgang Amadeus Mozart nacque a Salisburgo nel 1756. Compose la sua prima sinfonia a 8 anni e morì a 35, lasciando oltre 600 opere.", "factSource": "Mozarteum", "tags": ["musica", "classica", "Austria"], "minAge": 8, "timeLimitSeconds": 15 },
  { "id": "ART-003", "category": "art", "difficulty": 2, "world": "arti", "text": "Quale scrittore creò il personaggio di Don Chisciotte?", "options": ["Lope de Vega", "Miguel de Cervantes", "Calderón de la Barca", "Francisco de Quevedo"], "correctIndex": 1, "fact": "Cervantes pubblicò Don Chisciotte nel 1605. È considerato il primo romanzo moderno e il libro più tradotto dopo la Bibbia.", "factSource": "Real Academia Española", "tags": ["letteratura", "Spagna", "romanzo"], "minAge": 12, "timeLimitSeconds": 20 },

  { "id": "WILD-001", "category": "wild", "difficulty": 1, "world": "origini", "text": "Quante corde ha un violino?", "options": ["4", "5", "6", "3"], "correctIndex": 0, "fact": "Le 4 corde (Sol, Re, La, Mi) sono accordate per quinte. Il suono del violino è prodotto dall'archetto che fa vibrare le corde tramite la resina.", "factSource": "Conservatorio", "tags": ["musica", "strumenti"], "minAge": 6, "timeLimitSeconds": 15 },
  { "id": "WILD-002", "category": "wild", "difficulty": 1, "world": "origini", "text": "Quale animale è il più veloce sulla terra?", "options": ["Leone", "Ghepardo", "Visone", "Antilope"], "correctIndex": 1, "fact": "Il ghepardo raggiunge i 120 km/h in 3 secondi — più veloce di una Ferrari in accelerazione. Ma può mantenerlo solo per 30 secondi.", "factSource": "WWF", "tags": ["animali", "record", "Africa"], "minAge": 6, "timeLimitSeconds": 15 },
  { "id": "WILD-003", "category": "wild", "difficulty": 2, "world": "civilta", "text": "In quale paese è stato inventato il gioco degli scacchi?", "options": ["Cina", "Persia", "India", "Arabia"], "correctIndex": 2, "fact": "Gli scacchi nacquero in India intorno al VI sec. d.C. come 'Chaturanga'. Arrivarono in Europa attraverso la Persia e il mondo arabo.", "factSource": "FIDE", "tags": ["giochi", "storia", "India"], "minAge": 10, "timeLimitSeconds": 20 }
]
```

---

## 11. SISTEMA DI SCORING

```typescript
// utils/scoring.ts
export const SCORE_CONFIG = {
  1: { match: 50,  correct: 100, wrong: 20,  speedBonus: 0,   perfect: 200  },
  2: { match: 80,  correct: 200, wrong: 0,   speedBonus: 100, perfect: 500  },
  3: { match: 120, correct: 400, wrong: -50, speedBonus: 200, perfect: 1000 },
} as const;

export const RANK_THRESHOLDS: Record<string, number> = {
  curioso:     0,
  esploratore: 500,
  pensatore:   1200,
  sapiente:    2500,
  maestro:     5000,
  illuminato:  10000,
};

export const pointsToXP = (points: number): number => Math.floor(points * 0.5);

export const calculateStars = (score: number, maxScore: number, errors: number): 1|2|3 => {
  if (score / maxScore > 0.9 && errors === 0) return 3;
  if (score / maxScore > 0.6) return 2;
  return 1;
};
```

---

## 12. STRUTTURA LIVELLI, STAGIONI E SIDEQUEST

### Mappa mondi (percorso principale)
5 mondi narrativi in sequenza + Mondo ∞ procedurale:
- **Mondo 1 — Origini** (20 livelli) · Preistoria, miti, prime civiltà
- **Mondo 2 — Civiltà Antiche** (25 livelli) · Grecia, Roma, Egitto
- **Mondo 3 — Il Mediterraneo** (25 livelli) · Fenici, Islam, Bisanzio
- **Mondo 4 — Via della Seta** (30 livelli) · Cina, India, Mongoli
- **Mondo 5 — Rinascimento** (30 livelli) · Arte, Scienza, Scoperte
- **Mondo ∞ — Il Presente** · Livelli procedurali infiniti, griglia crescente

### Regola dei gruppi di 5 (copiata da Candy Crush)
- Livelli 1-3: difficoltà crescente
- Livello 4: **sempre più facile** — respiro intenzionale prima del boss
- Livello 5: **Boss** — 2 vite, domande difficoltà 2-3, citazione cinematica prima di iniziare

### Tipologie di livello
```typescript
type LevelType =
  | 'standard'   // 3 vite, mix categorie, obiettivo variabile
  | 'boss'       // ogni 5 livelli, 2 vite, citazione cinematica obbligatoria
  | 'special'    // categoria fissa, badge premio al completamento
  | 'night'      // solo 20:00-06:00, tema misteri della storia
  | 'seasonal'   // stagione corrente, scompare a fine stagione
```

### Obiettivi per livello (varietà come Candy Crush)
- **Timer:** raggiungi X punti entro 90/80/60 secondi
- **Mosse:** completa N match entro M mosse totali
- **Categoria:** fai 5 match della categoria specifica
- **Zero errori:** completa il livello senza sbagliare una risposta
- **Combo:** mantieni combo ×3 per almeno 10 mosse consecutive
- **Speed:** rispondi a 5 domande in meno di 5 secondi ciascuna

### Sistema vite — NO "aspetta 30 minuti"
- 3 vite **per livello** (non globali — si ricaricano ad ogni nuovo tentativo)
- 2 vite nei boss, 1 vita nei livelli hardcore (dopo livello 60)
- Cuori extra come ricompensa giornaliera gratuita o acquisto opzionale
- Mai obbligatorio pagare per continuare a giocare

### Stagioni (ogni 3 mesi)
- 15 livelli stagionali esclusivi tematicamente coerenti con l'era
- Track gratuita: 15 ricompense distribuite sui 30 livelli stagionali
- Track premium (€3,99 una tantum): 30 ricompense totali, skin e titoli esclusivi
- I livelli stagionali **scompaiono** a fine stagione → FOMO controllata
- Citazioni cinematiche ogni 3 livelli (più frequenti del normale)

### Sidequest
- **Giornaliere (reset ore 06:00):** 3 missioni semplici, mantengono la streak
- **Settimanali (reset lunedì):** 2 missioni impegnative, ricompense XP consistenti
- **Notturne (20:00–06:00):** tema "misteri della storia", scompaiono al mattino
- **Flash (2-4 ore):** eventi improvvisi via notifica push, es. XP doppio su Arte

### Curva difficoltà domande per livello
- Livelli 1–15: solo difficoltà 1
- Livelli 16–40: mix difficoltà 1 + 2
- Livelli 41+: mix difficoltà 1 + 2 + 3
- Boss: solo difficoltà 2 + 3
- Livello pre-boss (4, 9, 14, 19...): sempre e solo difficoltà 1

### Numeri target per fase
- **Beta:** 20 livelli (Mondo 1 completo)
- **Lancio pubblico:** 100 livelli (Mondi 1–3 completi)
- **Anno 1:** 250 livelli + Mondo ∞ attivo
- **Stagioni:** +15 livelli ogni 3 mesi, a tempo indeterminato

---

## 13. SEQUENZA DI BUILD — SEGUI QUESTO ORDINE

### Step 1 — Setup (Giorno 1)
- [ ] `npx create-expo-app WizzPop --template blank-typescript`
- [ ] Installa tutte le dipendenze elencate sopra
- [ ] Crea la struttura cartelle esatta
- [ ] Implementa `types/game.ts`
- [ ] Implementa `theme/colors.ts`
- [ ] Implementa `data/categories.ts`

### Step 2 — Logica core (Giorno 1-2)
- [ ] Implementa `utils/boardUtils.ts` (codice già scritto sopra — copia e adatta)
- [ ] Implementa `utils/scoring.ts`
- [ ] Implementa `store/gameStore.ts`
- [ ] Implementa `data/questions/` con le 15 domande di test in JSON
- [ ] Implementa `data/quotes.ts` con le 15 citazioni cinematiche
- [ ] Implementa `hooks/useQuestions.ts`

### Step 3 — Componenti UI (Giorno 2-3)
- [ ] `components/ui/Button.tsx`
- [ ] `components/game/Cell.tsx` — con animazioni Reanimated (selezione, match fade, entrata dall'alto)
- [ ] `components/game/GameGrid.tsx` — griglia 6×6 che chiama selectCell dello store
- [ ] `components/game/ScoreBar.tsx` — score, vite (❤️❤️❤️), combo multiplier
- [ ] `components/game/AnswerOption.tsx` — singola opzione con feedback visivo
- [ ] `components/game/QuestionModal.tsx` — bottom sheet con domanda, opzioni, timer, curiosità post-risposta
- [ ] `components/game/CinematicScreen.tsx` — schermata cinematica con particelle e letterbox

### Step 4 — Schermate (Giorno 3-4)
- [ ] `app/index.tsx` — HomeScreen con titolo WizzPop, bottone Gioca, animazione logo
- [ ] `app/(game)/level/[id].tsx` — GameScreen che integra Grid + Modal + Cinematic
- [ ] `app/(game)/result.tsx` — ResultScreen con stelle (1-3), score finale, bottone rigioca

### Step 5 — Polish beta (Giorno 4-5)
- [ ] Haptic feedback su match, errore, risposta corretta/sbagliata
- [ ] Animazione shuffle board quando deadlock (celle che si mescolano visivamente)
- [ ] Citazione cinematica alla fine di ogni livello completato
- [ ] Persistenza score e progressione con AsyncStorage
- [ ] Test su dispositivo reale (Expo Go)

---

## 13. REGOLE DI SVILUPPO

1. **TypeScript strict** — mai usare `any`, mai `@ts-ignore`
2. **Un file per componente** — nessun file oltre 200 righe
3. **Animazioni sempre su thread UI** — usare solo `useAnimatedStyle`, `withSpring`, `withTiming`, `withSequence`
4. **Mai `setTimeout` per animazioni** — usare `withDelay` di Reanimated
5. **Commenta le funzioni di logica complessa** — non il codice ovvio
6. **Testa boardUtils prima di toccare i componenti** — la logica deve funzionare prima dell'UI
7. **La curiosità post-risposta è sacra** — è il cuore del prodotto, non una nota a margine

---

## 14. METRICHE TARGET BETA

| Metrica | Target |
|---|---|
| FPS animazioni | ≥ 60fps su iPhone 11 e Android mid-range |
| Cold start | < 2 secondi |
| Bundle size | < 50 MB |
| D1 retention | ≥ 40% |
| Sessione media | ≥ 8 minuti |
| Crash rate | < 0.1% delle sessioni |

---

## 15. PRIMO PROMPT DA USARE CON CLAUDE CODE

```
Leggi il file CLAUDE.md nella cartella radice del progetto integralmente.

Sei il lead developer di WizzPop. Hai tutte le specifiche, i tipi TypeScript,
la logica core e il database domande già definiti nel documento.

Il tuo compito è costruire la beta seguendo esattamente la sequenza di build
dello Step 1: setup progetto, installazione dipendenze, struttura cartelle,
types/game.ts, theme/colors.ts, data/categories.ts.

Prima di scrivere codice, mostrami:
1. La struttura cartelle che creerai
2. Il contenuto di types/game.ts
3. Eventuali domande sulle specifiche

Non procedere oltre lo Step 1 senza la mia approvazione.
```

---

*WizzPop CLAUDE.md — versione 1.0*
*Aggiorna questo file ad ogni decisione di design significativa*
