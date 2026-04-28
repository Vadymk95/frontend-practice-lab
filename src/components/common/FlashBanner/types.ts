export type FlashKind = 'sessionEnded' | 'noActiveSession' | 'summaryUnavailable';

export interface FlashState {
    flash?: FlashKind;
}
