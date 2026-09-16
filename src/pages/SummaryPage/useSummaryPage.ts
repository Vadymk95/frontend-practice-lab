import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FlashState } from '@/components/common/FlashBanner';
import { track } from '@/lib/analytics';
import type { Question } from '@/lib/data/schema';
import { isYesterday, toLocalDayKey } from '@/lib/date';
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
    if (question.type === 'multi-choice') {
        if (!Array.isArray(answer)) return false;
        const sorted = [...(answer as number[])].sort().join(',');
        const correctSorted = [...question.correct].sort().join(',');
        return sorted === correctSorted;
    }
    if (question.type === 'bug-finding') {
        return answer === 'gotIt';
    }
    return false;
}

interface ScoredAnswer {
    questionId: string;
    category: string;
    correct: boolean;
}

interface SessionScore {
    correctCount: number;
    wrongQuestions: Question[];
    sessionResults: Record<string, boolean>;
    weakTopics: string[];
    scoredAnswers: ScoredAnswer[];
}

/**
 * Pure scoring pass over a finished session. A skipped question counts as not-correct in the
 * displayed score and in the saved session results, but is left out of `scoredAnswers` — the
 * adaptive algorithm must not read "I have not studied this yet" as "I got this wrong".
 */
function scoreSession(
    questionList: Question[],
    answers: Record<string, unknown>,
    skipList: string[]
): SessionScore {
    let correctCount = 0;
    const wrongQuestions: Question[] = [];
    const sessionResults: Record<string, boolean> = {};
    const scoredAnswers: ScoredAnswer[] = [];
    const categoryMap: Record<string, { total: number; wrong: number }> = {};

    for (const question of questionList) {
        const correct = isCorrectAnswer(question, answers[question.id]);
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

        if (!skipList.includes(question.id)) {
            scoredAnswers.push({ questionId: question.id, category: cat, correct });
        }
    }

    const weakTopics = Object.entries(categoryMap)
        .filter(([, { total, wrong }]) => wrong / total > WEAK_TOPIC_THRESHOLD)
        .map(([category]) => category);

    return { correctCount, wrongQuestions, sessionResults, weakTopics, scoredAnswers };
}

export function useSummaryPage() {
    const navigate = useNavigate();
    const questionList = useSessionStore.use.questionList();
    const answers = useSessionStore.use.answers();
    const skipList = useSessionStore.use.skipList();
    const config = useSessionStore.use.config();
    const timerMs = useSessionStore.use.timerMs();
    const isRepeat = useSessionStore.use.isRepeat();
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
    // A repeat/restart replays a subset under the original config's record key with a reset timer:
    // its duration is not comparable, so it never becomes a personal best.
    const isNewRecord =
        timerEnabled &&
        !isRepeat &&
        recordKey !== null &&
        (priorRecord === undefined || timerMs < priorRecord);

    // Guard: if no session data, redirect home with a flash so the user understands why
    useEffect(() => {
        if (questionList.length === 0) {
            const state: FlashState = { flash: 'summaryUnavailable' };
            navigate(RoutesPath.Root, { replace: true, state });
        }
    }, [questionList.length, navigate]);

    const { correctCount, wrongQuestions, weakTopics } = useMemo(
        () => scoreSession(questionList, answers, skipList),
        [questionList, answers, skipList]
    );

    // Read before the persistence effect calls updateStreak, and frozen for the life of the mount:
    // the lazy initializer runs once, so the post-update streak cannot overwrite the answer.
    const [isStreakReset] = useState(() => {
        const today = toLocalDayKey(new Date());
        const last = streak.lastActivityDate;
        return last !== '' && last !== today && !isYesterday(last, today);
    });

    // Apply the finished session to progress exactly once. Everything comes from the live store,
    // so a Back/Forward remount hits the scoredAt guard instead of re-applying weights, error
    // rates, the streak, the record and the analytics event a second time.
    useEffect(() => {
        const session = useSessionStore.getState();
        if (session.scoredAt !== null) return;
        if (session.questionList.length === 0) return;

        const score = scoreSession(session.questionList, session.answers, session.skipList);
        session.markScored();

        saveSessionResults(score.sessionResults);
        for (const answer of score.scoredAnswers) {
            recordAnswer(answer.questionId, answer.category, answer.correct);
        }
        updateStreak();
        if (isNewRecord && recordKey) {
            setRecord(recordKey, session.timerMs);
        }
        track('session_complete', {
            score: Object.values(score.sessionResults).filter(Boolean).length,
            total: Object.keys(score.sessionResults).length,
            durationMs: session.timerMs,
            weakCategories: score.weakTopics
        });
    }, [saveSessionResults, recordAnswer, updateStreak, setRecord, isNewRecord, recordKey]);

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
        track('repeat_mistakes_start', { count: pureWrongQuestions.length });
        setRepeatMistakes(pureWrongQuestions);
        navigate(RoutesPath.SessionPlay);
    };

    const handleRepeatSkipped = () => {
        track('repeat_mistakes_start', { count: skippedQuestions.length });
        setRepeatMistakes(skippedQuestions);
        navigate(RoutesPath.SessionPlay);
    };

    const handleRepeatAllMistakes = () => {
        track('repeat_mistakes_start', { count: allMistakeQuestions.length });
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
        isStreakReset,
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
