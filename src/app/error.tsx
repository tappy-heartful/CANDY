'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
      <h2 style={{ color: '#9B7CC3', marginBottom: '20px' }}>申し訳ありません。エラーが発生しました。</h2>
      <button
        onClick={() => reset()}
        style={{
          padding: '12px 24px',
          backgroundColor: '#F7A8C4',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        再試行する
      </button>
    </div>
  );
}
