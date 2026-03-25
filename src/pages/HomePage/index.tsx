import type { FC } from 'react';

import { SessionConfigurator } from '@/components/features/SessionConfigurator';

export const HomePage: FC = () => {
    return (
        <div className="container mx-auto max-w-2xl px-4 py-6">
            <SessionConfigurator />
        </div>
    );
};
