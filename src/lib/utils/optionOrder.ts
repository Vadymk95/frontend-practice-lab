/**
 * Fisher-Yates permutation of `0..length-1`, used to break the answer-position bias
 * of the question bank (the correct option sits at the same index in most files).
 *
 * The result maps DISPLAY position to ORIGINAL option index:
 * `order[displayIndex] === originalIndex`. Answers are always stored as original
 * indices, so the summary and the bank stay comparable.
 */
export const createOptionOrder = (length: number): number[] => {
    const order = Array.from({ length: Math.max(0, length) }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = order[i]!;
        order[i] = order[j]!;
        order[j] = tmp;
    }
    return order;
};

/**
 * Every draw for one question id is the same draw. Taking an answer back remounts the option
 * list, and a fresh permutation there would re-letter the options the reader had just compared
 * against the explanation. The cache lives for the page's lifetime; a question id is permanent,
 * so it is bounded by the size of the bank.
 */
const drawnOrders = new Map<string, number[]>();

export const getOptionOrder = (questionId: string, length: number): number[] => {
    const drawn = drawnOrders.get(questionId);
    if (drawn && drawn.length === length) return drawn;
    const order = createOptionOrder(length);
    drawnOrders.set(questionId, order);
    return order;
};
