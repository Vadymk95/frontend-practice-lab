import { useCallback, useEffect, useRef, useState } from 'react';
import type { BlockerFunction } from 'react-router-dom';
import { useBlocker, useNavigate } from 'react-router-dom';

import type { FlashState } from '@/components/common/FlashBanner';
import { useSessionSetup } from '@/hooks/session/useSessionSetup';
import { useQuestionKeyboard } from '@/hooks/ui/useQuestionKeyboard';
import { track } from '@/lib/analytics';
import type { Question } from '@/lib/data/schema';
import { RoutesPath } from '@/router/routes';
import { useSessionStore } from '@/store/session';

export interface SessionPlayPageState {
    isSetupLoading: boolean;
    isSetupError: boolean;
    questionCount: number;
    currentQuestion: Question | null;
    isAnswered: boolean;
    timerEnabled: boolean;
    timerMs: number;

    isMultiChoice: boolean;
    isCodeCompletion: boolean;
    isBugFinding: boolean;
    isBugFindingPendingSelfAssess: boolean;
    multiHasSelection: boolean;
    codeCompletionAllFilled: boolean;
    bugFindingCanSubmit: boolean;

    isEndDialogOpen: boolean;
    /** True once something is answered: ending now produces a scored summary, not a discard. */
    willScoreOnEnd: boolean;
    openEndDialog: () => void;
    closeEndDialog: () => void;
    confirmEndSession: () => void;

    handleNext: () => void;
    handleCheck: () => void;
    handleSubmit: () => void;
    onRetry: () => void;

    onSelectionChange: (hasSelection: boolean) => void;
    onCheckRegister: (checkFn: () => void) => void;
    onSubmitRegister: (submitFn: () => void) => void;
    onAllBlanksFilled: (filled: boolean) => void;
    onBugFindingCanSubmit: (canSubmit: boolean) => void;
    onSelectOptionRegister: (fn: (idx: number) => void) => void;
}

export function useSessionPlayPage(): SessionPlayPageState {
    const navigate = useNavigate();
    const { isLoading: isSetupLoading, isError: isSetupError, refetch } = useSessionSetup();
    const config = useSessionStore.use.config();
    const questionList = useSessionStore.use.questionList();
    const currentIndex = useSessionStore.use.currentIndex();
    const answers = useSessionStore.use.answers();
    const nextQuestion = useSessionStore.use.nextQuestion();
    const endSession = useSessionStore.use.endSession();
    const setQuestionList = useSessionStore.use.setQuestionList();
    const timerMs = useSessionStore.use.timerMs();
    const setTimerMs = useSessionStore.use.setTimerMs();

    const timerEnabled = config?.timerEnabled ?? false;

    const currentQuestion = questionList[currentIndex] ?? null;
    const rawAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
    // Bug-finding requires explicit self-assessment ('gotIt' | 'missedIt') after submit
    // before scoring is meaningful (see useSummaryPage.isCorrectAnswer). Until then,
    // suppress Next so the user can't accidentally skip the assessment and have the
    // answer count as wrong. Skip is a terminal state — `skipList` already classifies
    // the question as skipped on the summary, so we exit the pending gate too;
    // otherwise the user gets stuck (no action bar, and the in-card self-assess
    // buttons hide because `useBugFindingQuestion` auto-derives missedIt on isSkipped).
    const isBugFindingPendingSelfAssess =
        currentQuestion?.type === 'bug-finding' &&
        rawAnswer !== undefined &&
        rawAnswer !== 'skipped' &&
        rawAnswer !== 'gotIt' &&
        rawAnswer !== 'missedIt';
    const isAnswered =
        currentQuestion !== null && rawAnswer !== undefined && !isBugFindingPendingSelfAssess;
    const isLastQuestion = questionList.length > 0 && currentIndex === questionList.length - 1;

    const sessionCompletedRef = useRef(false);

    const handleNext = useCallback(() => {
        if (isLastQuestion) {
            sessionCompletedRef.current = true;
            navigate(RoutesPath.SessionSummary);
        } else {
            nextQuestion();
        }
    }, [isLastQuestion, navigate, nextQuestion]);

    const [isEndDialogRequested, setIsEndDialogRequested] = useState(false);

    const willScoreOnEnd = Object.keys(answers).length > 0;

    // Leaving through the browser Back gesture, a header link or any other in-app navigation
    // abandons the session just as the End button does, so it has to ask the same question.
    // Our own exits set sessionCompletedRef first and pass straight through.
    const shouldBlockExit = useCallback<BlockerFunction>(
        ({ currentLocation, nextLocation }) =>
            !sessionCompletedRef.current &&
            currentLocation.pathname !== nextLocation.pathname &&
            useSessionStore.getState().questionList.length > 0,
        []
    );
    const blocker = useBlocker(shouldBlockExit);

    // A blocked navigation IS the request to leave — no separate state to raise.
    const isEndDialogOpen = isEndDialogRequested || blocker.state === 'blocked';

    const openEndDialog = useCallback(() => setIsEndDialogRequested(true), []);
    const closeEndDialog = useCallback(() => {
        setIsEndDialogRequested(false);
        // A blocked navigation stays pending until it is released; resetting it drops the
        // attempted exit and leaves the user on the question they were on.
        if (blocker.state === 'blocked') blocker.reset();
    }, [blocker]);

    const confirmEndSession = useCallback(() => {
        const state = useSessionStore.getState();
        const attempted = state.questionList.filter((q) => state.answers[q.id] !== undefined);
        // The unmount cleanup below must not read this as an abandonment: either the summary
        // scores the session (and emits its own completion event), or there was nothing to score.
        sessionCompletedRef.current = true;
        setIsEndDialogRequested(false);
        // The end flow navigates on its own, so the attempted exit is dropped rather than
        // resumed: otherwise a Back gesture would win over the summary we are about to show.
        if (blocker.state === 'blocked') blocker.reset();

        if (attempted.length > 0) {
            // Ending mid-run keeps the questions the user actually reached. Without the trim the
            // untouched remainder would score as wrong and would be written into the adaptive
            // weights as questions the user got wrong rather than never saw.
            setQuestionList(attempted);
            navigate(RoutesPath.SessionSummary);
            return;
        }

        // Nothing was answered, so there is no summary to show. endSession() wipes session data
        // and stamps endedAt — useSessionSetup's !config redirect reads endedAt and skips, so
        // this navigate's sessionEnded flash is preserved.
        endSession();
        const flash: FlashState = { flash: 'sessionEnded' };
        // replace, not push: the session behind this route no longer exists, so a
        // Back onto /session/play would land on a page with nothing to show.
        navigate(RoutesPath.Root, { replace: true, state: flash });
    }, [navigate, endSession, setQuestionList, blocker]);

    // Fire session_abandoned when navigating away mid-session without completing
    useEffect(() => {
        return () => {
            if (sessionCompletedRef.current) return;
            const state = useSessionStore.getState();
            if (state.questionList.length > 0 && Object.keys(state.answers).length > 0) {
                track('session_abandoned', {
                    answered: Object.keys(state.answers).length,
                    total: state.questionList.length
                });
            }
        };
    }, []);

    // P-2: setup complete but filtered results empty — go back home
    // Use getState() to avoid stale closure: setQuestionList (called in useSessionSetup's
    // effect) updates the Zustand store synchronously, but the React closure here still
    // captures the pre-update questionList.length from the same render.
    useEffect(() => {
        if (
            !isSetupLoading &&
            !isSetupError &&
            config &&
            useSessionStore.getState().questionList.length === 0
        ) {
            // Say why: an empty pool after filtering is indistinguishable from a
            // crash unless the home screen explains the bounce.
            const flash: FlashState = { flash: 'noQuestionsMatch' };
            navigate(RoutesPath.Root, { replace: true, state: flash });
        }
    }, [isSetupLoading, isSetupError, config, navigate]);

    // Timer interval — starts when timerEnabled, clears on unmount
    useEffect(() => {
        if (!timerEnabled) return;
        const start = Date.now() - timerMs;
        const id = setInterval(() => {
            setTimerMs(Date.now() - start);
        }, 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timerEnabled]); // only start once when timer is enabled

    const [multiHasSelection, setMultiHasSelection] = useState(false);
    const [codeCompletionAllFilled, setCodeCompletionAllFilled] = useState(false);
    const [bugFindingCanSubmit, setBugFindingCanSubmit] = useState(false);

    const checkFnRef = useRef<(() => void) | null>(null);
    const submitFnRef = useRef<(() => void) | null>(null);
    const selectFnRef = useRef<((idx: number) => void) | null>(null);

    const onSelectionChange = useCallback((hasSelection: boolean) => {
        setMultiHasSelection(hasSelection);
    }, []);

    const onCheckRegister = useCallback((checkFn: () => void) => {
        checkFnRef.current = checkFn;
    }, []);

    const handleCheck = useCallback(() => {
        checkFnRef.current?.();
    }, []);

    const onAllBlanksFilled = useCallback((filled: boolean) => {
        setCodeCompletionAllFilled(filled);
    }, []);

    const onBugFindingCanSubmit = useCallback((canSubmit: boolean) => {
        setBugFindingCanSubmit(canSubmit);
    }, []);

    const onSubmitRegister = useCallback((submitFn: () => void) => {
        submitFnRef.current = submitFn;
    }, []);

    const handleSubmit = useCallback(() => {
        submitFnRef.current?.();
    }, []);

    const onSelectOptionRegister = useCallback((fn: (idx: number) => void) => {
        selectFnRef.current = fn;
    }, []);

    const handleSelectOption = useCallback((idx: number) => {
        selectFnRef.current?.(idx);
    }, []);

    // Reset the per-question flags when the question changes. The registration refs
    // are deliberately NOT cleared here: child effects commit before the parent's, so
    // clearing would wipe the registration the new question's card just made and leave
    // the number-key shortcuts calling nothing. Each card re-registers per question,
    // and every ref is only ever invoked for the matching question type.
    useEffect(() => {
        setMultiHasSelection(false);
        setCodeCompletionAllFilled(false);
        setBugFindingCanSubmit(false);
    }, [currentQuestion?.id]);

    const isMultiChoice = currentQuestion?.type === 'multi-choice';
    const isCodeCompletion = currentQuestion?.type === 'code-completion';
    const isBugFinding = currentQuestion?.type === 'bug-finding';

    const optionCount =
        currentQuestion?.type === 'single-choice' || currentQuestion?.type === 'multi-choice'
            ? currentQuestion.options.length
            : 0;

    const handleKeyboardSubmit = useCallback(() => {
        if (isAnswered) {
            handleNext();
        } else if (isMultiChoice) {
            handleCheck();
        } else if (isCodeCompletion || isBugFinding) {
            handleSubmit();
        }
    }, [
        isAnswered,
        isMultiChoice,
        isCodeCompletion,
        isBugFinding,
        handleNext,
        handleCheck,
        handleSubmit
    ]);

    useQuestionKeyboard({
        optionCount,
        onSelectOption: handleSelectOption,
        onSubmit: handleKeyboardSubmit,
        isAnswered,
        enabled: !isEndDialogOpen
    });

    return {
        isSetupLoading,
        isSetupError,
        questionCount: questionList.length,
        currentQuestion,
        isAnswered,
        timerEnabled,
        timerMs,

        isMultiChoice,
        isCodeCompletion,
        isBugFinding,
        isBugFindingPendingSelfAssess,
        multiHasSelection,
        codeCompletionAllFilled,
        bugFindingCanSubmit,

        isEndDialogOpen,
        willScoreOnEnd,
        openEndDialog,
        closeEndDialog,
        confirmEndSession,

        handleNext,
        handleCheck,
        handleSubmit,
        onRetry: refetch,

        onSelectionChange,
        onCheckRegister,
        onSubmitRegister,
        onAllBlanksFilled,
        onBugFindingCanSubmit,
        onSelectOptionRegister
    };
}
