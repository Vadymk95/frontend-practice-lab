export function useSessionActionBar() {
    return {
        desktopWrapperClass: 'hidden lg:flex justify-end mt-2',
        mobileWrapperClass:
            'lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]'
    };
}
