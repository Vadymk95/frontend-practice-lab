import { LocalStorageService } from './LocalStorageService';

export const storageService = new LocalStorageService();
export type { StorageService, StreakData, SessionPreset, SessionConfig } from './types';
