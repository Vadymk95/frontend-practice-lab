export type FlashKind =
    'sessionEnded' | 'noActiveSession' | 'summaryUnavailable' | 'noQuestionsMatch';

export interface FlashState {
    flash?: FlashKind;
}
