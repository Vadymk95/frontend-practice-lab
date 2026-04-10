import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Question } from '@/lib/data/schema';
import { isYesterday } from '@/lib/date';
import { generateRecordKey } from '@/lib/utils/generateRecordKey';
import { RoutesPath } from '@/router/routes';
import { useProgressStore } from '@/store/progress';
import { useSessionStore } from '@/store/session';

const WEAK_TOPIC_THRESHOLD = 0.3; // error rate > 30% = weak

function isCorrectAnswer(question: Question, answer: unknown): boolean {
    if (question.type === 'single-choice') {
        return typeof answer === 'number' && answer === question.correct;
    }
    if (question.type === 'code-completion') {
        return answer === 'correct';
    }
    // multi-choice, bug-finding handled in future stories
    return false;
}

export function useSummaryPage() {
    const navigate = useNavigate();
    const questionList = useSessionStore.use.questionList();
    const answers = useSessionStore.use.answers();
    const skipList = useSessionStore.use.skipList();
    const config = useSessionStore.use.config();
    const timerMs = useSessionStore.use.timerMs();
    const setRepeatMistakes = useSessionStore.use.setRepeatMistakes();
    const saveSessionResults = useProgressStore.use.saveSessionResults();
    const recordAnswer = useProgressStore.use.recordAnswer();
    const updateStreak = useProgressStore.use.updateStreak();
    const streak = useProgressStore.use.streak();
    const records = useProgressStore.use.records();
    const setRecord = useProgressStore.use.setRecord();

    const timerEnabled = config?.timerEnabled ?? false;
    const recordKey = timerEnabled && config ? generateRecordKey(config) : null;
    const priorRecord = recordKey ? records[recordKey] : undefined;
    const isNewRecord =
        timerEnabled && recordKey !== null && (priorRecord === undefined || timerMs < priorRecord);

    // Guard: if no session data, redirect home
    useEffect(() => {
        if (questionList.length === 0) {
            navigate(RoutesPath.Root, { replace: true });
        }
    }, [questionList.length, navigate]);

    // Single-pass: score + wrong questions + session results + weak topics — stable deps [questionList, answers]
    const { correctCount, wrongQuestions, sessionResults, weakTopics } = useMemo(() => {
        let correctCount = 0;
        const wrongQuestions: Question[] = [];
        const sessionResults: Record<string, boolean> = {};
        const categoryMap: Record<string, { total: number; wrong: number }> = {};

        for (const question of questionList) {
            const answer = answers[question.id];
            const correct = isCorrectAnswer(question, answer);
            sessionResults[question.id] = correct;

            const cat = question.category;
            if (!categoryMap[cat]) categoryMap[cat] = { total: 0, wrong: 0 };
            categoryMap[cat].total++;

            if (correct) {
                correctCount++;
            } else {
                wrongQuestions.push(question);
                categoryMap[cat].wrong++;
            }
        }

        const weakTopics = Object.entries(categoryMap)
            .filter(([, { total, wrong }]) => wrong / total > WEAK_TOPIC_THRESHOLD)
            .map(([category]) => category);

        return { correctCount, wrongQuestions, sessionResults, weakTopics };
    }, [questionList, answers]);

    // Ref captures latest sessionResults — avoids stale closure without adding sessionResults to save-effect deps
    const sessionResultsRef = useRef(sessionResults);
    sessionResultsRef.current = sessionResults;

    // Refs for timer record save — captured at render time to use in mount-only effect
    const isNewRecordRef = useRef(isNewRecord);
    isNewRecordRef.current = isNewRecord;
    const recordKeyRef = useRef(recordKey);
    recordKeyRef.current = recordKey;
    const timerMsRef = useRef(timerMs);
    timerMsRef.current = timerMs;

    // Build category map once per render — stable ref for mount effect
    const questionCategoryMapRef = useRef<Record<string, string>>({});
    questionCategoryMapRef.current = Object.fromEntries(
        questionList.map((q) => [q.id, q.category])
    );

    // Computed once on first render (before updateStreak fires and triggers a re-render).
    // Using null sentinel so subsequent re-renders don't overwrite the pre-update value.
    const isStreakResetRef = useRef<boolean | null>(null);
    if (isStreakResetRef.current === null) {
        const today = new Date().toISOString().slice(0, 10);
        const last = streak.lastActivityDate;
        isStreakResetRef.current = last !== '' && last !== today && !isYesterday(last, today);
    }

    // Persist session results once on mount and record answers for adaptive algorithm
    useEffect(() => {
        const results = sessionResultsRef.current;
        if (Object.keys(results).length === 0) return;
        saveSessionResults(results);
        const catMap = questionCategoryMapRef.current;
        for (const [questionId, correct] of Object.entries(results)) {
            const category = catMap[questionId];
            if (category) recordAnswer(questionId, category, correct);
        }
        updateStreak();
        if (isNewRecordRef.current && recordKeyRef.current) {
            setRecord(recordKeyRef.current, timerMsRef.current);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentional — mount only

    const skippedQuestions = useMemo(
        () => questionList.filter((q) => skipList.includes(q.id)),
        [questionList, skipList]
    );

    const pureWrongQuestions = useMemo(
        () => wrongQuestions.filter((q) => !skipList.includes(q.id)),
        [wrongQuestions, skipList]
    );

    const allMistakeQuestions = useMemo(
        () => [...pureWrongQuestions, ...skippedQuestions],
        [pureWrongQuestions, skippedQuestions]
    );

    const isPerfectScore = pureWrongQuestions.length === 0 && skippedQuestions.length === 0;

    const handleRepeatWrong = () => {
        setRepeatMistakes(pureWrongQuestions);
        navigate(RoutesPath.SessionPlay);
    };

    const handleRepeatSkipped = () => {
        setRepeatMistakes(skippedQuestions);
        navigate(RoutesPath.SessionPlay);
    };

    const handleRepeatAllMistakes = () => {
        setRepeatMistakes(allMistakeQuestions);
        navigate(RoutesPath.SessionPlay);
    };

    const handleRestartSession = () => {
        setRepeatMistakes(questionList);
        navigate(RoutesPath.SessionPlay);
    };

    const handleHome = () => navigate(RoutesPath.Root);

    return {
        correctCount,
        totalCount: questionList.length,
        pureWrongCount: pureWrongQuestions.length,
        skippedCount: skippedQuestions.length,
        allMistakesCount: allMistakeQuestions.length,
        weakTopics,
        isPerfectScore,
        streak,
        isStreakReset: isStreakResetRef.current,
        timerEnabled,
        sessionDurationMs: timerMs,
        isNewRecord,
        priorRecordMs: priorRecord,
        handleRepeatWrong,
        handleRepeatSkipped,
        handleRepeatAllMistakes,
        handleRestartSession,
        handleHome
    };
}
