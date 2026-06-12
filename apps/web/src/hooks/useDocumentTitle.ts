import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} - 棉花识别助手`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}