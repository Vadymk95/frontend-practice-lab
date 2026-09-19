export type FlashKind =
    | 'sessionEnded'
    | 'noActiveSession'
    | 'summaryUnavailable'
    | 'noQuestionsMatch'
    | 'presetOutdated';

export interface FlashState {
    flash?: FlashKind;
}
