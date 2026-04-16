import type { FC } from 'react';

export const Footer: FC = () => {
    return (
        <footer className="border-t bg-card py-4 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} InterviewOS
        </footer>
    );
};
