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
            timerMs: 0
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
