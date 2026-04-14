import * as Haptics from 'expo-haptics';

/**
 * Feedback aptico centralizzato.
 * Tutte le funzioni sono fire-and-forget (non serve await).
 */
export function useHaptics() {
  return {
    /** Tap su match valido */
    triggerMatch: () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),

    /** Selezione sbagliata (due categorie diverse) */
    triggerError: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),

    /** Risposta corretta alla domanda */
    triggerSuccess: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),

    /** Risposta sbagliata o timeout domanda */
    triggerWrong: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),

    /** Tap leggero generico (selezione cella, shuffle) */
    triggerLight: () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  };
}
