import { Question } from '../../types/game';

import geografiaRaw from './geografia.json';
import scienzaRaw from './scienza.json';
import storiaRaw from './storia.json';
import arteRaw from './arte.json';
import wildRaw from './wild.json';

export const ALL_QUESTIONS: Question[] = [
  ...(geografiaRaw as Question[]),
  ...(scienzaRaw as Question[]),
  ...(storiaRaw as Question[]),
  ...(arteRaw as Question[]),
  ...(wildRaw as Question[]),
];
