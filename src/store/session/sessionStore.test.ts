import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from './sessionStore';

describe('sessionStore', () => {
    beforeEach(() => {
        useSessionStore.setState({
            questionList: [],
            currentIndex: 0,
            answers: {},
            skipList: [],
            config: null,
            timerMs: 0,
            endedAt: null,
            scoredAt: null
        });
    });

    describe('removeAnswer', () => {
        it('removes the answer for the given questionId', () => {
            useSessionStore.setState({ answers: { 'q-1': 2, 'q-2': 1 } });
            useSessionStore.getState().removeAnswer('q-1');
            expect(useSessionStore.getState().answers['q-1']).toBeUndefined();
            expect(useSessionStore.getState().answers['q-2']).toBe(1);
        });

        it('does nothing when questionId not in answers', () => {
            useSessionStore.setState({ answers: { 'q-1': 2 } });
            useSessionStore.getState().removeAnswer('q-99');
            expect(useSessionStore.getState().answers).toEqual({ 'q-1': 2 });
        });

        it('results in empty answers when last answer removed', () => {
            useSessionStore.setState({ answers: { 'q-1': 2 } });
            useSessionStore.getState().removeAnswer('q-1');
            expect(useSessionStore.getState().answers).toEqual({});
        });
    });
});

describe('sessionStore — scoredAt', () => {
    const config = {
        categories: ['javascript'],
        difficulty: 'all',
        mode: 'all',
        questionCount: 5,
        order: 'random',
        timerEnabled: false
    } as never;

    it('starts null so the summary scores the session once', () => {
        expect(useSessionStore.getState().scoredAt).toBeNull();
    });

    it('markScored stamps a timestamp', () => {
        useSessionStore.getState().markScored();
        expect(useSessionStore.getState().scoredAt).toBeTypeOf('number');
    });

    it('markScored keeps the first stamp when called twice', () => {
        useSessionStore.getState().markScored();
        const first = useSessionStore.getState().scoredAt;
        useSessionStore.getState().markScored();
        expect(useSessionStore.getState().scoredAt).toBe(first);
    });

    it('setConfig clears it so the next session scores again', () => {
        useSessionStore.getState().markScored();
        useSessionStore.getState().setConfig(config);
        expect(useSessionStore.getState().scoredAt).toBeNull();
    });

    it('setRepeatMistakes clears it so a repeat session scores again', () => {
        useSessionStore.getState().markScored();
        useSessionStore.getState().setRepeatMistakes([]);
        expect(useSessionStore.getState().scoredAt).toBeNull();
    });

    it('resetSession clears it', () => {
        useSessionStore.getState().markScored();
        useSessionStore.getState().resetSession();
        expect(useSessionStore.getState().scoredAt).toBeNull();
    });

    it('endSession clears it', () => {
        useSessionStore.getState().markScored();
        useSessionStore.getState().endSession();
        expect(useSessionStore.getState().scoredAt).toBeNull();
    });
});
