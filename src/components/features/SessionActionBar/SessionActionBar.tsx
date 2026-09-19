import type { FC, Ref } from 'react';

import { Button } from '@/components/ui/button';

import { useSessionActionBar } from './useSessionActionBar';

export interface SessionActionBarProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    /** The in-flow copy of the bar — the caller scrolls it into view when an answer is revealed. */
    ref?: Ref<HTMLDivElement>;
}

export const SessionActionBar: FC<SessionActionBarProps> = ({ label, onClick, disabled, ref }) => {
    const { desktopWrapperClass, mobileWrapperClass } = useSessionActionBar();

    return (
        <>
            <div ref={ref} className={desktopWrapperClass}>
                <Button disabled={disabled} onClick={onClick}>
                    {label}
                </Button>
            </div>
            <div className={mobileWrapperClass}>
                <Button disabled={disabled} onClick={onClick} className="w-full">
                    {label}
                </Button>
            </div>
        </>
    );
};
