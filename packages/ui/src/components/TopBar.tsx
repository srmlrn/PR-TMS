'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { EnvBadge, type EnvBadgeVariant } from './Badge';
import styles from './TopBar.module.css';

function readDockCollapsed(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dataset.dockCollapsed === 'true';
}

function useDockCollapsed(): boolean {
  const [collapsed, setCollapsed] = useState(false);

  useLayoutEffect(() => {
    setCollapsed(readDockCollapsed());

    const observer = new MutationObserver(() => {
      setCollapsed(readDockCollapsed());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-dock-collapsed'],
    });
    return () => observer.disconnect();
  }, []);

  return collapsed;
}

export interface TopBarProps {
  title: string;
  /** Shown in the top bar when the sidebar is collapsed (hidden when expanded). */
  templeName?: string;
  templeIcon?: string;
  envLabel?: string;
  envVariant?: EnvBadgeVariant;
  avatarInitials?: string;
  roleLabel?: string;
  searchPlaceholder?: string;
  languages?: string[];
  themeToggle?: ReactNode;
  /** Committee switcher and other account-specific controls shown inside the user menu */
  menuExtras?: ReactNode;
  onSignOut?: () => void;
  /** @deprecated Use menuExtras, roleLabel, and onSignOut instead */
  roleSwitcher?: ReactNode;
}

export function TopBar({
  title,
  templeName,
  templeIcon,
  envLabel = 'PROD',
  envVariant = 'prod',
  avatarInitials = 'RK',
  roleLabel,
  searchPlaceholder = '',
  languages = ['EN', 'हि', 'தமி', 'తె'],
  themeToggle,
  menuExtras,
  onSignOut,
  roleSwitcher,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const useLegacyBar = Boolean(roleSwitcher && !onSignOut && !menuExtras);
  const sidebarCollapsed = useDockCollapsed();
  const showTempleBrand = Boolean(templeName && sidebarCollapsed);

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {showTempleBrand && (
          <span className={styles.templeBrand} title={templeName}>
            {templeIcon && (
              <span className={styles.templeIcon} aria-hidden>
                {templeIcon}
              </span>
            )}
            <span className={styles.templeName}>{templeName}</span>
            <span className={styles.titleDivider} aria-hidden>
              ·
            </span>
          </span>
        )}
        <span className={styles.title}>{title}</span>
        <EnvBadge variant={envVariant}>{envLabel}</EnvBadge>
      </div>
      <div className={styles.right}>
        <div className={styles.searchPill}>
          <span className={styles.searchIcon} aria-hidden>
            ⌕
          </span>
          <input
            className={styles.searchInput}
            placeholder={searchPlaceholder}
            aria-label="Search"
          />
        </div>

        {useLegacyBar ? (
          <>
            <select className={styles.select} aria-label="Language" defaultValue="EN">
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            {themeToggle}
            {roleSwitcher}
            <div className={styles.avatar} aria-hidden>
              {avatarInitials}
            </div>
          </>
        ) : (
          <div className={styles.userMenu} ref={rootRef}>
            <button
              type="button"
              className={styles.userMenuTrigger}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuId}
              title={roleLabel ? `${roleLabel} account menu` : 'Account menu'}
            >
              <span className={styles.avatar} aria-hidden>
                {avatarInitials}
              </span>
              <span className={styles.userMenuChevron} aria-hidden>
                ▾
              </span>
            </button>

            {menuOpen && (
              <div
                id={menuId}
                className={styles.userMenuPanel}
                role="menu"
                aria-label="Account menu"
              >
                <div className={styles.userMenuHeader}>
                  <span
                    className={`${styles.avatar} ${styles.userMenuHeaderAvatar}`}
                    aria-hidden
                  >
                    {avatarInitials}
                  </span>
                  <div className={styles.userMenuHeaderText}>
                    {roleLabel && <span className={styles.userMenuRole}>{roleLabel}</span>}
                    <EnvBadge variant={envVariant}>{envLabel}</EnvBadge>
                  </div>
                </div>

                <div className={styles.userMenuSection}>
                  <label className={styles.menuRow}>
                    <span className={styles.menuRowLabel}>Language</span>
                    <select className={styles.menuSelect} aria-label="Language" defaultValue="EN">
                      {languages.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </label>

                  {themeToggle && (
                    <div className={styles.menuRow}>
                      <span className={styles.menuRowLabel}>Theme</span>
                      <div className={styles.menuRowControl}>{themeToggle}</div>
                    </div>
                  )}

                  {menuExtras && <div className={styles.menuExtras}>{menuExtras}</div>}
                </div>

                {onSignOut && (
                  <div className={styles.userMenuFooter}>
                    <button
                      type="button"
                      className={styles.signOutAction}
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onSignOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
