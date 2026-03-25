import type { FC } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { AnswerOption } from '@/components/features/QuestionCard/AnswerOption';
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
