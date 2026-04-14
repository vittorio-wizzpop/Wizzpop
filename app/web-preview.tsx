/**
 * web-preview.tsx
 * Versione browser-safe di WizzPop — nessuna dipendenza da Reanimated.
 * Naviga su localhost:8081/web-preview per vederla.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { colors } from '../theme/colors';
import { CATEGORIES } from '../data/categories';
import { CategoryKey } from '../types/game';

// ---------------------------------------------------------------------------
// Tipi locali
// ---------------------------------------------------------------------------

type CellData = {
  id: string;
  category: CategoryKey;
  row: number;
  col: number;
  matched: boolean;
};

type Screen = 'home' | 'game';

// ---------------------------------------------------------------------------
// Dati — domanda di esempio per il modal
// ---------------------------------------------------------------------------

const SAMPLE_QUESTION = {
  text: 'Qual è il paese più grande del mondo per superficie?',
  options: ['Canada', 'Russia', 'Cina', 'USA'],
  correctIndex: 1,
  fact: 'La Russia copre 17,1 milioni di km² — più del doppio del Canada. Si estende su 11 fusi orari.',
  category: 'geo' as CategoryKey,
};

// ---------------------------------------------------------------------------
// Utilità board
// ---------------------------------------------------------------------------

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

function generateBoard(): CellData[][] {
  return Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 6 }, (_, c) => ({
      id: `${r}-${c}-${Math.random().toString(36).slice(2)}`,
      category: CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)],
      row: r,
      col: c,
      matched: false,
    }))
  );
}

function applyGravityAndRefill(board: CellData[][]): CellData[][] {
  const rows = board.length;
  const cols = board[0].length;
  const next: CellData[][] = Array.from({ length: rows }, () => new Array(cols) as CellData[]);

  for (let c = 0; c < cols; c++) {
    const surviving: CellData[] = [];
    for (let r = rows - 1; r >= 0; r--) {
      if (!board[r][c].matched) surviving.push({ ...board[r][c] });
    }
    for (let r = rows - 1; r >= 0; r--) {
      const idx = rows - 1 - r;
      if (idx < surviving.length) {
        next[r][c] = { ...surviving[idx], row: r, col: c };
      } else {
        const cat = CATEGORY_KEYS[Math.floor(Math.random() * CATEGORY_KEYS.length)];
        next[r][c] = {
          id: `new-${r}-${c}-${Math.random().toString(36).slice(2)}`,
          category: cat,
          row: r,
          col: c,
          matched: false,
        };
      }
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Componenti
// ---------------------------------------------------------------------------

// --- HomeScreen ---

function HomeScreen({ onPlay }: { onPlay: () => void }) {
  return (
    <View style={home.container}>
      <View style={home.hero}>
        <Text style={home.emoji}>🧠</Text>
        <Text style={home.title}>WizzPop</Text>
        <Text style={home.tagline}>Gioca. Impara. Sorprenditi.</Text>
      </View>

      <View style={home.bottom}>
        <TouchableOpacity style={home.playBtn} onPress={onPlay} activeOpacity={0.85}>
          <Text style={home.playBtnText}>▶  Gioca ora</Text>
        </TouchableOpacity>
        <Text style={home.version}>Beta v0.1 — Web Preview</Text>
      </View>
    </View>
  );
}

const home = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 17,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  bottom: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 16,
  },
  playBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  playBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  version: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});

// --- Cella della griglia ---

function Cell({
  cell,
  selected,
  onPress,
}: {
  cell: CellData;
  selected: boolean;
  onPress: () => void;
}) {
  const cat = CATEGORIES[cell.category];

  return (
    <TouchableOpacity
      style={[
        cell_s.cell,
        { backgroundColor: cat.bg },
        selected && cell_s.selected,
        cell.matched && cell_s.matched,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={cell.matched}
    >
      <Text style={cell_s.emojiText}>{cat.emoji}</Text>
    </TouchableOpacity>
  );
}

const cell_s = StyleSheet.create({
  cell: {
    width: 52,
    height: 52,
    margin: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  matched: {
    opacity: 0,
  },
  emojiText: {
    fontSize: 22,
  },
});

// --- Modal domanda ---

type QuestionModalProps = {
  visible: boolean;
  category: CategoryKey;
  question: string;
  options: string[];
  correctIndex: number;
  fact: string;
  onDismiss: (correct: boolean) => void;
};

function QuestionModal({
  visible,
  category,
  question,
  options,
  correctIndex,
  fact,
  onDismiss,
}: QuestionModalProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const cat = CATEGORIES[category];

  const handleOption = (idx: number) => {
    if (chosen !== null) return;
    setChosen(idx);
    setTimeout(() => {
      onDismiss(idx === correctIndex);
      setChosen(null);
    }, 1400);
  };

  const optionBg = (idx: number) => {
    if (chosen === null) return colors.surface;
    if (idx === correctIndex) return colors.success;
    if (idx === chosen) return colors.error;
    return colors.surface;
  };

  const optionTextColor = (idx: number) => {
    if (chosen !== null && (idx === correctIndex || idx === chosen)) return '#FFF';
    return colors.textPrimary;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={qm.overlay}>
        <View style={qm.sheet}>
          {/* Badge categoria */}
          <View style={[qm.badge, { backgroundColor: cat.bg }]}>
            <Text style={[qm.badgeText, { color: cat.text }]}>
              {cat.emoji}  {cat.label}
            </Text>
          </View>

          <Text style={qm.question}>{question}</Text>

          <View style={qm.options}>
            {options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[qm.option, { backgroundColor: optionBg(idx) }]}
                onPress={() => handleOption(idx)}
                activeOpacity={0.8}
                disabled={chosen !== null}
              >
                <Text style={[qm.optionText, { color: optionTextColor(idx) }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {chosen !== null && (
            <View style={qm.factBox}>
              <Text style={qm.factLabel}>Lo sapevi?</Text>
              <Text style={qm.factText}>{fact}</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const qm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  question: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  options: {
    gap: 10,
  },
  option: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E4DF',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  factBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    padding: 14,
    gap: 4,
    marginTop: 4,
  },
  factLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  factText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
});

// --- ScoreBar ---

function ScoreBar({
  score,
  lives,
  combo,
  onBack,
}: {
  score: number;
  lives: number;
  combo: number;
  onBack: () => void;
}) {
  return (
    <View style={sb.bar}>
      <TouchableOpacity onPress={onBack} style={sb.backBtn}>
        <Text style={sb.backText}>←</Text>
      </TouchableOpacity>

      <View style={sb.lives}>
        {[1, 2, 3].map(i => (
          <Text key={i} style={{ fontSize: 18, opacity: i <= lives ? 1 : 0.2 }}>❤️</Text>
        ))}
      </View>

      <Text style={sb.score}>{score.toLocaleString()}</Text>

      {combo > 1 && (
        <View style={sb.comboBadge}>
          <Text style={sb.comboText}>×{combo}</Text>
        </View>
      )}
    </View>
  );
}

const sb = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#EEECEA',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: '700',
  },
  lives: {
    flexDirection: 'row',
    gap: 2,
  },
  score: {
    flex: 1,
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  comboBadge: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comboText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFF',
  },
});

// --- GameScreen ---

function GameScreen({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<CellData[][]>(generateBoard);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(1);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [lastCategory, setLastCategory] = useState<CategoryKey>('geo');
  const [gameOver, setGameOver] = useState(false);
  const [win, setWin] = useState(false);

  const TARGET_PAIRS = 10;

  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (showQuestion || board[row][col].matched || gameOver || win) return;

      if (!selected) {
        setSelected([row, col]);
        return;
      }

      const [selRow, selCol] = selected;

      // Deseleziona stessa cella
      if (selRow === row && selCol === col) {
        setSelected(null);
        return;
      }

      const selCell = board[selRow][selCol];
      const tapCell = board[row][col];

      if (selCell.category === tapCell.category) {
        // Match!
        const newBoard = board.map(r => r.map(c => ({ ...c })));
        newBoard[selRow][selCol].matched = true;
        newBoard[row][col].matched = true;
        setBoard(newBoard);
        setSelected(null);
        setLastCategory(tapCell.category);
        setShowQuestion(true);
        const newPairs = matchedPairs + 1;
        setMatchedPairs(newPairs);
      } else {
        // Errore
        const newLives = Math.max(0, lives - 1);
        setLives(newLives);
        setCombo(1);
        setSelected(null);
        if (newLives === 0) setGameOver(true);
      }
    },
    [board, selected, showQuestion, matchedPairs, lives, gameOver, win]
  );

  const handleAnswer = useCallback(
    (correct: boolean) => {
      const points = correct ? 100 * Math.max(1, combo) : 0;
      const newCombo = correct ? Math.min(combo + 1, 5) : 1;
      setScore(s => s + points);
      setCombo(newCombo);
      setShowQuestion(false);
      const refreshed = applyGravityAndRefill(board);
      setBoard(refreshed);
      if (matchedPairs >= TARGET_PAIRS) setWin(true);
    },
    [combo, board, matchedPairs]
  );

  if (gameOver || win) {
    return (
      <View style={gs.container}>
        <View style={gs.endScreen}>
          <Text style={gs.endEmoji}>{win ? '🌟' : '💀'}</Text>
          <Text style={gs.endTitle}>{win ? 'Livello completato!' : 'Game Over'}</Text>
          <Text style={gs.endScore}>Punteggio: {score.toLocaleString()}</Text>
          <TouchableOpacity
            style={gs.endBtn}
            onPress={() => {
              setBoard(generateBoard());
              setScore(0);
              setLives(3);
              setCombo(1);
              setMatchedPairs(0);
              setGameOver(false);
              setWin(false);
              setSelected(null);
            }}
          >
            <Text style={gs.endBtnText}>Rigioca</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[gs.endBtn, gs.endBtnSecondary]} onPress={onBack}>
            <Text style={[gs.endBtnText, { color: colors.primary }]}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={gs.container}>
      <ScoreBar score={score} lives={lives} combo={combo} onBack={onBack} />

      {/* Legend categorie */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={gs.legend}
        contentContainerStyle={gs.legendContent}
      >
        {CATEGORY_KEYS.map(key => {
          const cat = CATEGORIES[key];
          return (
            <View key={key} style={[gs.legendItem, { backgroundColor: cat.bg }]}>
              <Text style={[gs.legendText, { color: cat.text }]}>
                {cat.emoji} {cat.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Griglia 6×6 */}
      <View style={gs.gridWrapper}>
        <View style={gs.grid}>
          {board.map((row, r) => (
            <View key={r} style={gs.row}>
              {row.map((cell, c) => (
                <Cell
                  key={cell.id}
                  cell={cell}
                  selected={selected !== null && selected[0] === r && selected[1] === c}
                  onPress={() => handleCellPress(r, c)}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Progress bar match */}
      <View style={gs.progressArea}>
        <Text style={gs.progressLabel}>
          {matchedPairs}/{TARGET_PAIRS} coppie
        </Text>
        <View style={gs.progressTrack}>
          <View
            style={[
              gs.progressFill,
              { width: `${(matchedPairs / TARGET_PAIRS) * 100}%` as any },
            ]}
          />
        </View>
      </View>

      <QuestionModal
        visible={showQuestion}
        category={lastCategory}
        question={SAMPLE_QUESTION.text}
        options={SAMPLE_QUESTION.options}
        correctIndex={SAMPLE_QUESTION.correctIndex}
        fact={SAMPLE_QUESTION.fact}
        onDismiss={handleAnswer}
      />
    </View>
  );
}

const gs = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  legend: {
    maxHeight: 44,
    paddingVertical: 6,
  },
  legendContent: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  gridWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  grid: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
  },
  progressArea: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5E4DF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  endScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  endEmoji: {
    fontSize: 72,
  },
  endTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  endScore: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  endBtn: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  endBtnSecondary: {
    backgroundColor: colors.primaryLight,
  },
  endBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
});

// ---------------------------------------------------------------------------
// Root: gestione navigazione home ↔ game
// ---------------------------------------------------------------------------

export default function WebPreview() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <View style={root.wrapper}>
      {/* Contenitore mobile centrato */}
      <View style={root.phone}>
        {screen === 'home' ? (
          <HomeScreen onPlay={() => setScreen('game')} />
        ) : (
          <GameScreen onBack={() => setScreen('home')} />
        )}
      </View>
    </View>
  );
}

const root = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#1A1A18',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
  },
  phone: {
    width: 390,
    height: 844,
    backgroundColor: colors.background,
    overflow: 'hidden',
    borderRadius: Platform.OS === 'web' ? 40 : 0,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' } as any)
      : {}),
  },
});
