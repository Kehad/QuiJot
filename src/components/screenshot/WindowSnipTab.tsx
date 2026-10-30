import React, { useMemo } from 'react';
import { AppWindow, RefreshCw, Search, X, Camera } from 'lucide-react';
import { CapturableSource } from '../../types/electron';
import styles from './WindowSnipTab.module.css';

interface WindowSnipTabProps {
  sources: CapturableSource[];
  isLoadingSources: boolean;
  onRefreshSources: () => void;
  onSelectWindow: (sourceId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export const WindowSnipTab: React.FC<WindowSnipTabProps> = ({
  sources,
  isLoadingSources,
  onRefreshSources,
  onSelectWindow,
  searchQuery,
  onSearchQueryChange,
}) => {
  const filteredSources = useMemo(() => {
    if (!searchQuery.trim()) return sources;
    const q = searchQuery.toLowerCase();
    return sources.filter((s) => s.name.toLowerCase().includes(q));
  }, [sources, searchQuery]);

  return (
    <div className={styles.windowSnipSection}>
      <div className={styles.windowSnipHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AppWindow size={13} />
          <span style={{ fontSize: '11px', fontWeight: 600 }}>
            Active Windows ({filteredSources.length})
          </span>
        </div>

        <button
          type="button"
          className={`${styles.btnIcon} ${isLoadingSources ? styles.isSpinning : ''}`}
          onClick={onRefreshSources}
          title="Refresh open windows list"
          style={{ width: '22px', height: '22px' }}
        >
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Active Window Quick Card */}
      {filteredSources.length > 0 && !searchQuery && (
        <div
          className={styles.activeWindowQuickCard}
          onClick={() => onSelectWindow(filteredSources[0].id)}
          title={`Click to capture active window: ${filteredSources[0].name}`}
        >
          <div className={styles.activeWindowQuickLeft}>
            <div className={styles.activeDotLive} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflow: 'hidden' }}>
              <span className={styles.activeWindowQuickBadge}>Active Window (In Focus)</span>
              <span className={styles.activeWindowQuickName}>{filteredSources[0].name}</span>
            </div>
          </div>
          <button
            type="button"
            className={styles.btnPrimary}
            style={{ padding: '3px 8px', fontSize: '10px', flexShrink: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectWindow(filteredSources[0].id);
            }}
          >
            <Camera size={11} />
            <span>Snip Window</span>
          </button>
        </div>
      )}

      {/* Filter search */}
      <div className={styles.windowSearchBar} style={{ marginTop: '2px' }}>
        <Search size={11} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search active windows..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className={styles.windowSearchInput}
          style={{ fontSize: '10.5px', padding: '4px 22px 4px 24px' }}
        />
        {searchQuery && (
          <button
            type="button"
            className={styles.clearSearchBtn}
            onClick={() => onSearchQueryChange('')}
          >
            <X size={9} />
          </button>
        )}
      </div>

      {/* Window Grid */}
      <div className={styles.windowSnipGrid}>
        {isLoadingSources ? (
          <div className={styles.windowLoadingState} style={{ padding: '24px 10px' }}>
            <RefreshCw size={14} className={styles.isSpinning} />
            <span style={{ fontSize: '11px' }}>Scanning active windows...</span>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className={styles.windowEmptyState} style={{ padding: '24px 10px' }}>
            <span style={{ fontSize: '11px' }}>No other active windows found.</span>
            <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>
              Switch to Rectangular Snip or Full Screen tab above.
            </span>
          </div>
        ) : (
          <div className={styles.windowCardsMiniGrid}>
            {filteredSources.map((source) => (
              <div
                key={source.id}
                className={styles.windowSnipCard}
                onClick={() => onSelectWindow(source.id)}
                title={`Click to capture: ${source.name}`}
              >
                <div className={styles.windowSnipCardThumb}>
                  {source.thumbnail ? (
                    <img src={source.thumbnail} alt="" className={styles.windowThumbImg} />
                  ) : (
                    <AppWindow size={20} className={styles.windowThumbPlaceholder} />
                  )}
                  <div className={styles.windowSnipCardHoverPrompt}>
                    <Camera size={11} />
                    <span>Snip</span>
                  </div>
                </div>

                <div className={styles.windowSnipCardInfo}>
                  {source.appIcon ? (
                    <img src={source.appIcon} alt="" className={styles.windowAppIcon} />
                  ) : (
                    <div className={styles.windowAppIconPlaceholder}>
                      <AppWindow size={9} />
                    </div>
                  )}
                  <span className={styles.windowCardTitle}>{source.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
