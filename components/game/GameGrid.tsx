import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Cell } from './Cell';
import { useGameStore } from '../../store/gameStore';
import { useHaptics } from '../../hooks/useHaptics';

const GRID_PADDING = 12;
const CELL_GAP     = 4;
const COLS         = 6;

export function GameGrid() {
  const board        = useGameStore(s => s.board);
  const selected     = useGameStore(s => s.selected);
  const selectCell   = useGameStore(s => s.selectCell);
  const lives        = useGameStore(s => s.lives);
  const matchedPairs = useGameStore(s => s.matchedPairs);
  const shuffleCount = useGameStore(s => s.shuffleCount);
  const { width }    = useWindowDimensions();
  const haptics      = useHaptics();

  // Haptics: errore (vita persa)
  const prevLives = useRef(lives);
  useEffect(() => {
    if (lives < prevLives.current) haptics.triggerError();
    prevLives.current = lives;
  }, [lives]);

  // Haptics: match riuscito
  const prevPairs = useRef(matchedPairs);
  useEffect(() => {
    if (matchedPairs > prevPairs.current) haptics.triggerMatch();
    prevPairs.current = matchedPairs;
  }, [matchedPairs]);

  // Animazione + haptic shuffle (deadlock risolto)
  const gridTranslateX = useSharedValue(0);
  const prevShuffle    = useRef(shuffleCount);
  useEffect(() => {
    if (shuffleCount > prevShuffle.current) {
      haptics.triggerLight();
      gridTranslateX.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming( 10, { duration: 55 }),
        withTiming( -8, { duration: 50 }),
        withTiming(  8, { duration: 50 }),
        withTiming(  0, { duration: 45 }),
      );
    }
    prevShuffle.current = shuffleCount;
  }, [shuffleCount]);

  const gridAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: gridTranslateX.value }],
  }));

  if (!board.length) return null;

  const cellSize = (width - GRID_PADDING * 2 - CELL_GAP * (COLS - 1)) / COLS;

  return (
    <Animated.View style={[styles.grid, { padding: GRID_PADDING }, gridAnimStyle]}>
      {board.map((row, r) => (
        <View
          key={r}
          style={[styles.row, { gap: CELL_GAP, marginBottom: r < board.length - 1 ? CELL_GAP : 0 }]}
        >
          {row.map((cell, c) => {
            const isSelected = selected !== null && selected[0] === r && selected[1] === c;
            return (
              <Cell
                key={cell.id}
                cell={cell}
                isSelected={isSelected}
                isHinted={false}
                onPress={() => selectCell(r, c)}
                size={cellSize}
              />
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
