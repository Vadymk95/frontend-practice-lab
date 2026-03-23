import type { FC } from 'react';
import { Outlet } from 'react-router-dom';

export const Main: FC = () => {
    return (
        <main
            id="main-content"
            className="w-full flex-1 px-4 py-8 md:px-6 lg:mx-auto lg:max-w-[760px] lg:px-8"
        >
            <Outlet />
        </main>
    );
};
