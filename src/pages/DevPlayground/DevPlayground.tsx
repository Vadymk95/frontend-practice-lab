import type { FC } from 'react';

import { CodeBlock } from '@/components/common/CodeBlock';
import { ErrorState } from '@/components/common/ErrorState';
import { AnswerOption } from '@/components/features/QuestionCard/AnswerOption';
import { BugFindingQuestion } from '@/components/features/QuestionCard/BugFinding';
import { CodeCompletionQuestion } from '@/components/features/QuestionCard/CodeCompletion';
import { ExplanationPanel } from '@/components/features/QuestionCard/ExplanationPanel';
import { SessionConfigurator } from '@/components/features/SessionConfigurator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const DevPlayground: FC = () => {
    return (
        <div className="container mx-auto max-w-4xl space-y-8 p-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Dev UI Playground</h1>
                <p className="text-muted-foreground">
                    A dedicated space to visualize and test UI components in isolation during
                    development.
                </p>
            </div>

            <hr className="border-border" />

            {/* Buttons Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">Buttons</h2>
                <div className="grid gap-4 rounded-lg border p-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Variants</h3>
                        <div className="flex flex-wrap gap-4">
                            <Button variant="default">Default</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="link">Link</Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Sizes</h3>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button size="sm">Small</Button>
                            <Button size="default">Default</Button>
                            <Button size="lg">Large</Button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">States</h3>
                        <div className="flex flex-wrap items-center gap-4">
                            <Button disabled>Disabled</Button>
                            <Button variant="secondary" disabled>
                                Disabled Secondary
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Inputs Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">Inputs</h2>
                <div className="grid gap-4 rounded-lg border p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label
                                htmlFor="default-input"
                                className="text-sm font-medium leading-none"
                            >
                                Default Input
                            </label>
                            <Input id="default-input" placeholder="Email address" />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="disabled-input"
                                className="text-sm font-medium leading-none"
                            >
                                Disabled Input
                            </label>
                            <Input id="disabled-input" disabled placeholder="Cannot type here" />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="file-input"
                                className="text-sm font-medium leading-none"
                            >
                                File Input
                            </label>
                            <Input id="file-input" type="file" />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="password-input"
                                className="text-sm font-medium leading-none"
                            >
                                Password Input
                            </label>
                            <Input id="password-input" type="password" placeholder="******" />
                        </div>
                    </div>
                </div>
            </section>

            {/* SessionConfigurator Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">SessionConfigurator</h2>
                <div className="rounded-lg border p-6">
                    <SessionConfigurator />
                </div>
            </section>

            {/* QuestionCard States Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">Question Card States</h2>
                <div className="rounded-lg border p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Unanswered (options selectable)
                        </h3>
                        <div className="flex flex-col gap-2 max-w-md">
                            <AnswerOption
                                index={0}
                                text="Option A — correct"
                                isSelected={false}
                                isAnswered={false}
                                isCorrect={true}
                                isDisabled={false}
                                onSelect={() => {}}
                            />
                            <AnswerOption
                                index={1}
                                text="Option B"
                                isSelected={false}
                                isAnswered={false}
                                isCorrect={false}
                                isDisabled={false}
                                onSelect={() => {}}
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Correct answer revealed (A selected → green)
                        </h3>
                        <div className="flex flex-col gap-2 max-w-md">
                            <AnswerOption
                                index={0}
                                text="Option A — correct"
                                isSelected={true}
                                isAnswered={true}
                                isCorrect={true}
                                isDisabled={false}
                                onSelect={() => {}}
                            />
                            <AnswerOption
                                index={1}
                                text="Option B"
                                isSelected={false}
                                isAnswered={true}
                                isCorrect={false}
                                isDisabled={true}
                                onSelect={() => {}}
                            />
                        </div>
                        <div className="mt-2 max-w-md">
                            <ExplanationPanel explanation="Option A is correct because it satisfies all conditions." />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Wrong answer revealed (B selected → red, A correct → green)
                        </h3>
                        <div className="flex flex-col gap-2 max-w-md">
                            <AnswerOption
                                index={0}
                                text="Option A — correct"
                                isSelected={false}
                                isAnswered={true}
                                isCorrect={true}
                                isDisabled={false}
                                onSelect={() => {}}
                            />
                            <AnswerOption
                                index={1}
                                text="Option B — wrong selected"
                                isSelected={true}
                                isAnswered={true}
                                isCorrect={false}
                                isDisabled={false}
                                onSelect={() => {}}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Summary States Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">Summary Page States</h2>
                <div className="rounded-lg border p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            With wrong answers (Repeat mistakes CTA)
                        </h3>
                        <div className="flex flex-col gap-3 max-w-md">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Your score</p>
                                <p className="text-5xl font-bold tabular-nums">38 / 50</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-2">Focus areas</p>
                                <ul className="flex flex-wrap gap-2">
                                    {['JavaScript', 'TypeScript', 'React'].map((topic) => (
                                        <li
                                            key={topic}
                                            className="px-3 py-1 rounded-full text-xs border border-border bg-muted text-muted-foreground"
                                        >
                                            {topic}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button variant="default">Repeat mistakes (12)</Button>
                                <Button variant="secondary">New session</Button>
                                <Button variant="ghost">Home</Button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Perfect score (Try again / Try something else CTAs)
                        </h3>
                        <div className="flex flex-col gap-3 max-w-md">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Your score</p>
                                <p className="text-5xl font-bold tabular-nums">50 / 50</p>
                                <p className="mt-2 text-accent font-medium">Perfect score!</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button variant="default">Try again</Button>
                                <Button variant="secondary">Try something else</Button>
                                <Button variant="ghost">Home</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CodeBlock Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">CodeBlock</h2>
                <div className="rounded-lg border p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            JavaScript (readonly)
                        </h3>
                        <CodeBlock
                            lang="javascript"
                            code={`function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}`}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            TypeScript
                        </h3>
                        <CodeBlock
                            lang="typescript"
                            code={`interface User {\n  id: string;\n  name: string;\n  role: 'admin' | 'user';\n}\n\nfunction getUser(id: string): Promise<User | null> {\n  return fetch(\`/api/users/\${id}\`).then(r => r.json());\n}`}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Long lines (horizontal scroll test)
                        </h3>
                        <CodeBlock
                            lang="javascript"
                            code={`const result = someVeryLongFunctionName(firstArgument, secondArgument, thirdArgument, fourthArgument, fifthArgument);`}
                        />
                    </div>
                </div>
            </section>

            {/* BugFindingQuestion Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">BugFindingQuestion</h2>
                <div className="rounded-lg border p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            With options — pre-submit
                        </h3>
                        <BugFindingQuestion
                            question={{
                                id: 'bf-demo-1',
                                type: 'bug-finding',
                                category: 'javascript',
                                difficulty: 'medium',
                                tags: ['closures'],
                                question: 'Find the bug in this closure:',
                                code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n}`,
                                options: [
                                    'var should be let',
                                    'setTimeout delay is wrong',
                                    'console.log is wrong'
                                ],
                                correct: 'var should be let',
                                referenceAnswer: `for (let i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 100);\n}`,
                                explanation:
                                    'var is function-scoped. By the time the timeouts fire, i is 3. Using let creates a new binding per iteration.'
                            }}
                            onSubmitRegister={() => {}}
                            onSelfAssessRegister={() => {}}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Text input variant — pre-submit
                        </h3>
                        <BugFindingQuestion
                            question={{
                                id: 'bf-demo-2',
                                type: 'bug-finding',
                                category: 'javascript',
                                difficulty: 'easy',
                                tags: ['types'],
                                question: 'What is wrong with this comparison?',
                                code: `if (userAge == "18") {\n  grantAccess();\n}`,
                                correct: 'uses loose equality instead of strict',
                                referenceAnswer: `if (userAge === 18) {\n  grantAccess();\n}`,
                                explanation:
                                    'Use === for type-safe comparison. == coerces types which can lead to unexpected behavior.'
                            }}
                            onSubmitRegister={() => {}}
                            onSelfAssessRegister={() => {}}
                        />
                    </div>
                </div>
            </section>

            {/* CodeCompletionQuestion Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">CodeCompletionQuestion</h2>
                <div className="rounded-lg border p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3">
                            Pre-submit (blanks empty)
                        </h3>
                        <CodeCompletionQuestion
                            question={{
                                id: 'cc-demo-1',
                                type: 'code-completion',
                                category: 'javascript',
                                difficulty: 'easy',
                                tags: ['variables'],
                                question: 'Complete the function body:',
                                code: 'function add(a, b) {\n  return __BLANK__ + __BLANK__;\n}',
                                blanks: ['a', 'b'],
                                referenceAnswer: 'function add(a, b) {\n  return a + b;\n}',
                                explanation:
                                    'Add the two parameters. Both a and b are the function arguments.'
                            }}
                            onSubmitRegister={() => {}}
                            onAllBlanksFilled={() => {}}
                        />
                    </div>
                </div>
            </section>

            {/* ErrorState Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight">ErrorState</h2>
                <div className="rounded-lg border p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                            With retry
                        </h3>
                        <ErrorState
                            message="Could not load questions. Check your connection."
                            onRetry={() => {}}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                            Without retry / fallback message
                        </h3>
                        <ErrorState />
                    </div>
                </div>
            </section>
        </div>
    );
};
