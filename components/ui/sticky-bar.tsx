import type { ReactNode } from "react";

/**
 * Phone action bar (Work spec 6.6.1, 6.8.7): a glass pill fixed above the tab bar holding the
 * page's main action, its children sharing the width. Hidden from 1024px, where the action sits in
 * the page. Set `aboveTabBar={false}` on pages without a tab bar (`AppShell focus`). The page needs
 * bottom padding so its last lines aren't hidden under it (about 80px on top of the tab bar's).
 */
export function StickyActionBar({
  children,
  aboveTabBar = true,
  label = "Actions",
  className = "",
}: {
  children: ReactNode;
  aboveTabBar?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      className={`y-bar y-stickybar ${className}`}
      data-above-tabbar={aboveTabBar ? undefined : "false"}
    >
      {children}
    </div>
  );
}
