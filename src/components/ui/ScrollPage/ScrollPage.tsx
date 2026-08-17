'use client';

import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './ScrollPage.module.css';

const LOADING_MORE_SPINNER_MIN_MS = 750;
const OBSERVER_ROOT_MARGIN = '300px 0px';

type Props = {
  children: ReactNode;
  hasMore?: boolean;
  loading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  loadingMoreLabel?: string;
};

export default function ScrollPage({
  children,
  hasMore = false,
  loading = false,
  loadingMore = false,
  onLoadMore,
  loadingMoreLabel = 'Cargando más elementos...',
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockRef = useRef(false);
  const [showLoadingMoreSpinner, setShowLoadingMoreSpinner] = useState(false);
  const loadingMoreStartedAtRef = useRef<number | null>(null);
  const minSpinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loadingMore) {
      loadMoreLockRef.current = false;
    }
  }, [loadingMore]);

  useEffect(() => {
    if (!hasMore) {
      loadMoreLockRef.current = false;
    }
  }, [hasMore]);

  useEffect(() => {
    if (loadingMore) {
      loadingMoreStartedAtRef.current ??= Date.now();
      setShowLoadingMoreSpinner(true);
      if (minSpinnerTimeoutRef.current) {
        clearTimeout(minSpinnerTimeoutRef.current);
        minSpinnerTimeoutRef.current = null;
      }
      return;
    }

    const startedAt = loadingMoreStartedAtRef.current;
    loadingMoreStartedAtRef.current = null;
    if (startedAt == null) {
      setShowLoadingMoreSpinner(false);
      return;
    }

    const elapsed = Date.now() - startedAt;
    const remaining = LOADING_MORE_SPINNER_MIN_MS - elapsed;
    if (remaining <= 0) {
      setShowLoadingMoreSpinner(false);
      return;
    }

    minSpinnerTimeoutRef.current = setTimeout(() => {
      minSpinnerTimeoutRef.current = null;
      setShowLoadingMoreSpinner(false);
    }, remaining);

    return () => {
      if (minSpinnerTimeoutRef.current) {
        clearTimeout(minSpinnerTimeoutRef.current);
        minSpinnerTimeoutRef.current = null;
      }
    };
  }, [loadingMore]);

  // IntersectionObserver para detectar scroll al final
  useEffect(() => {
    if (!hasMore || !onLoadMore || loading || loadingMore) return;
    const target = sentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadMoreLockRef.current) return;
        loadMoreLockRef.current = true;
        void onLoadMore();
      },
      { root: null, rootMargin: OBSERVER_ROOT_MARGIN, threshold: 0.01 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, onLoadMore]);

  return (
    <div className={styles.container}>
      {children}
      {hasMore ? (
        <div
          ref={sentinelRef}
          className={styles.sentinel}
          data-testid="scroll-page-sentinel"
        />
      ) : null}
      {showLoadingMoreSpinner ? (
        <div className={styles.loadingMore} data-testid="scroll-page-spinner">
          <LoaderCircle className={styles.spinner} size={24} />
          <span className={styles.loadingMoreLabel}>{loadingMoreLabel}</span>
        </div>
      ) : null}
    </div>
  );
}
