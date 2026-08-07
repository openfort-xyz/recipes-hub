import { useState, useEffect } from 'react';

const MAX_HISTORY_POINTS = 20;

export const usePriceChart = (price: number | null, isLoading: boolean) => {
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [timestamps, setTimestamps] = useState<string[]>([]);

  useEffect(() => {
    if (!price || isLoading) {
      return;
    }

    const timeLabel = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // Accumulating a rolling window from a changing prop can only happen in an
    // effect — it needs the previous render's history, not just this render's price.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPriceHistory((prev) => [...prev, price].slice(-MAX_HISTORY_POINTS));
    setTimestamps((prev) => [...prev, timeLabel].slice(-MAX_HISTORY_POINTS));
  }, [price, isLoading]);

  return {
    priceHistory,
    timestamps,
  };
};
