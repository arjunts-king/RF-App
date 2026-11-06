import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, Plus, Check } from 'lucide-react';

export interface NavItem<T = string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show?: boolean;
  badge?: string;
  badgeColor?: string;
  desc?: string;
  isQuickAction?: boolean;
}

export interface NavSubHeading<T = string> {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  items: NavItem<T>[];
}

interface FlyoutSidebarProps<T = string> {
  moduleTitle: string;
  moduleBadge?: string;
  subHeadings: NavSubHeading<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  activeRole?: string;
  footerSubtitle?: string;
}

export function FlyoutSidebar<T extends string>({
  moduleTitle,
  moduleBadge,
  subHeadings,
  activeTab,
  onTabChange,
  activeRole,
  footerSubtitle
}: FlyoutSidebarProps<T>) {
  const [hoveredSubHeading, setHoveredSubHeading] = useState<NavSubHeading<T> | null>(null);
  const [pinnedSubHeadingId, setPinnedSubHeadingId] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const [mobileExpandedId, setMobileExpandedId] = useState<string | null>(null);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine which subheading currently owns the activeTab
  const activeSubHeading = subHeadings.find((sh) =>
    sh.items.some((item) => item.id === activeTab && (item.show === undefined || item.show))
  );

  // Initialize mobile expanded section to current active subheading
  useEffect(() => {
    if (activeSubHeading && !mobileExpandedId) {
      setMobileExpandedId(activeSubHeading.id);
    }
  }, [activeSubHeading]);

  // Handle positioning the floating flyout next to the target subheading row
  const positionFlyout = useCallback((element: HTMLElement, subHeading: NavSubHeading<T>) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    const rect = element.getBoundingClientRect();
    const visibleCount = subHeading.items.filter((i) => i.show === undefined || i.show).length;
    const estimatedHeight = Math.max(160, visibleCount * 58 + 70);

    // Calculate vertical position bounded by window height
    const calculatedTop = Math.max(
      12,
      Math.min(rect.top - 6, window.innerHeight - estimatedHeight - 16)
    );

    setFlyoutPos({
      top: calculatedTop,
      left: rect.right + 10
    });
    setHoveredSubHeading(subHeading);
  }, []);

  const handleMouseEnterRow = (element: HTMLElement, subHeading: NavSubHeading<T>) => {
    positionFlyout(element, subHeading);
  };

  const handleMouseLeaveRow = () => {
    closeTimerRef.current = setTimeout(() => {
      if (!pinnedSubHeadingId) {
        setHoveredSubHeading(null);
        setFlyoutPos(null);
      }
    }, 220);
  };

  const handleFlyoutMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const handleFlyoutMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      if (!pinnedSubHeadingId) {
        setHoveredSubHeading(null);
        setFlyoutPos(null);
      }
    }, 180);
  };

  const handleRowClick = (element: HTMLElement, subHeading: NavSubHeading<T>) => {
    // On click, if this subheading is already pinned/open, toggle it off; otherwise pin it
    if (pinnedSubHeadingId === subHeading.id) {
      setPinnedSubHeadingId(null);
      setHoveredSubHeading(null);
      setFlyoutPos(null);
    } else {
      setPinnedSubHeadingId(subHeading.id);
      positionFlyout(element, subHeading);
    }

    // Toggle for mobile accordion as well
    setMobileExpandedId(mobileExpandedId === subHeading.id ? null : subHeading.id);
  };

  // Close flyout on outside click or escape
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(target) &&
        flyoutRef.current &&
        !flyoutRef.current.contains(target)
      ) {
        setHoveredSubHeading(null);
        setPinnedSubHeadingId(null);
        setFlyoutPos(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoveredSubHeading(null);
        setPinnedSubHeadingId(null);
        setFlyoutPos(null);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectItem = (itemId: T) => {
    onTabChange(itemId);
    setHoveredSubHeading(null);
    setPinnedSubHeadingId(null);
    setFlyoutPos(null);
  };

  const displayedSubHeading = hoveredSubHeading || (pinnedSubHeadingId ? subHeadings.find(s => s.id === pinnedSubHeadingId) : null);
  const visibleFlyoutItems = displayedSubHeading
    ? displayedSubHeading.items.filter((i) => i.show === undefined || i.show)
    : [];

  return (
    <>
      <aside
        ref={sidebarRef}
        className="w-full md:w-44 lg:w-48 bg-white md:border-r border-gray-100 flex flex-col shrink-0 h-full select-none"
      >
        {/* Module Header Bar */}
        <div className="p-3 border-b border-gray-100/90 bg-gradient-to-b from-gray-50/70 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-900 block truncate">
              {moduleTitle}
            </span>
            {moduleBadge && (
              <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-full border border-rose-200 shrink-0">
                {moduleBadge}
              </span>
            )}
          </div>
          <p className="text-[10px] text-ink-500 font-medium mt-0.5 leading-tight">
            Select sub-heading for options
          </p>
        </div>

        {/* Sub-Headings List (Desktop Flyout Trigger + Mobile Accordion) */}
        <div className="p-2 space-y-1 flex-1 overflow-y-auto">
          {subHeadings.map((subHeading) => {
            const visibleItems = subHeading.items.filter((i) => i.show === undefined || i.show);
            if (visibleItems.length === 0) return null;

            const isGroupActive = subHeading.items.some((i) => i.id === activeTab);
            const isHovered = displayedSubHeading?.id === subHeading.id;
            const Icon = subHeading.icon;

            return (
              <div key={subHeading.id} className="relative">
                <button
                  type="button"
                  onClick={(e) => handleRowClick(e.currentTarget, subHeading)}
                  onMouseEnter={(e) => handleMouseEnterRow(e.currentTarget, subHeading)}
                  onMouseLeave={handleMouseLeaveRow}
                  className={`w-full group text-left px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between gap-1.5 border ${
                    isHovered
                      ? 'bg-rose-50/90 text-rose-900 border-rose-200/90 shadow-2xs'
                      : isGroupActive
                      ? 'bg-gradient-to-r from-rose-50/80 to-white text-rose-950 border-rose-200/70 shadow-2xs font-bold'
                      : 'text-ink-700 hover:bg-gray-50/90 hover:text-ink-950 border-transparent'
                  }`}
                  aria-haspopup="true"
                  aria-expanded={isHovered}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isGroupActive
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : isHovered
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-gray-100 text-ink-600 group-hover:bg-gray-200/80 group-hover:text-ink-900'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold tracking-tight text-ink-900 group-hover:text-rose-900 break-words whitespace-normal leading-snug">
                        {subHeading.title}
                      </div>
                    </div>
                  </div>

                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition-transform text-ink-400 group-hover:text-rose-600 ${
                      isHovered ? 'translate-x-0.5 text-rose-600' : ''
                    }`}
                  />
                </button>

                {/* Mobile Accordion Inline View (Only visible on small viewports) */}
                <div className="md:hidden">
                  {mobileExpandedId === subHeading.id && (
                    <div className="pl-4 pr-1 py-1.5 mt-1 space-y-1 bg-gray-50/80 rounded-xl border border-gray-100">
                      {visibleItems.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition ${
                              isItemActive
                                ? 'bg-rose-600 text-white font-bold'
                                : 'text-ink-700 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {item.badge && (
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                  isItemActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-ink-700'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/60 text-xs">
          {activeRole && (
            <div className="flex items-center justify-between text-ink-500">
              <span className="text-[11px]">Role:</span>
              <span className="font-semibold text-rose-700 capitalize text-[11px]">
                {activeRole.replace('_', ' ')}
              </span>
            </div>
          )}
          {footerSubtitle && (
            <div className="text-[10px] text-ink-500 mt-1 truncate">
              {footerSubtitle}
            </div>
          )}
        </div>
      </aside>

      {/* Floating Flyout Menu Popover (Desktop / Tablet) */}
      {displayedSubHeading && flyoutPos && (
        <div
          ref={flyoutRef}
          onMouseEnter={handleFlyoutMouseEnter}
          onMouseLeave={handleFlyoutMouseLeave}
          style={{
            position: 'fixed',
            top: `${flyoutPos.top}px`,
            left: `${flyoutPos.left}px`,
            zIndex: 100
          }}
          className="hidden md:block w-72 lg:w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/90 p-3.5 animate-in fade-in zoom-in-95 duration-150 text-left select-none"
        >
          {/* Header of Flyout */}
          <div className="pb-2.5 mb-2 border-b border-gray-100 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {displayedSubHeading.title}
              </span>
            </div>
            <span className="text-[10px] text-ink-400 font-semibold">
              {visibleFlyoutItems.length} {visibleFlyoutItems.length === 1 ? 'Option' : 'Options'}
            </span>
          </div>

          {/* Items List */}
          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-0.5">
            {visibleFlyoutItems.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = activeTab === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                    isItemActive
                      ? 'bg-rose-600 text-white shadow-xs font-bold'
                      : 'hover:bg-rose-50/80 text-ink-800 hover:text-rose-900'
                  }`}
                  onClick={() => handleSelectItem(item.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isItemActive
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-ink-600 group-hover:bg-rose-100 group-hover:text-rose-700'
                      }`}
                    >
                      <ItemIcon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold tracking-tight ${
                              isItemActive
                                ? 'bg-white/25 text-white'
                                : item.badgeColor || 'bg-rose-100 text-rose-800 border border-rose-200/60'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.desc && (
                        <p
                          className={`text-[10px] line-clamp-1 leading-snug mt-0.5 ${
                            isItemActive ? 'text-white/80' : 'text-ink-500'
                          }`}
                        >
                          {item.desc}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side indicator or Quick '+' Action */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    {item.isQuickAction ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectItem(item.id);
                        }}
                        title={`Open ${item.label}`}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                          isItemActive
                            ? 'bg-white/20 text-white hover:bg-white/30'
                            : 'bg-gray-100 text-ink-600 hover:bg-rose-600 hover:text-white'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    ) : isItemActive ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-ink-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
