import type { FC } from 'react';

import { Button } from '@/components/ui/button';

import { useSessionActionBar } from './useSessionActionBar';

export interface SessionActionBarProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

export const SessionActionBar: FC<SessionActionBarProps> = ({ label, onClick, disabled }) => {
    const { desktopWrapperClass, mobileWrapperClass } = useSessionActionBar();

    return (
        <>
            <div className={desktopWrapperClass}>
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
