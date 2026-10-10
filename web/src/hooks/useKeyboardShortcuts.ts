import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseKeyboardShortcutsOptions {
  onOpenHelp?: () => void;
  onCloseModal?: () => void;
  onFocusPlanInput?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const navigate = useNavigate();
  const [gPressed, setGPressed] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keystrokes in inputs, textareas, and contenteditable elements unless it's Escape
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        setGPressed(false);
        if (options.onCloseModal) {
          options.onCloseModal();
        }
        return;
      }

      if (isInput) {
        return;
      }

      // Help shortcut: '?'
      if (e.key === '?') {
        e.preventDefault();
        if (options.onOpenHelp) {
          options.onOpenHelp();
        }
        return;
      }

      // Focus plan shortcut: '/'
      if (e.key === '/') {
        e.preventDefault();
        if (options.onFocusPlanInput) {
          options.onFocusPlanInput();
        } else {
          navigate('/plans');
        }
        return;
      }

      // 'g' prefix navigation handling
      if (e.key.toLowerCase() === 'g' && !gPressed) {
        setGPressed(true);
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
          setGPressed(false);
        }, 1200);
        return;
      }

      if (gPressed) {
        const key = e.key.toLowerCase();
        setGPressed(false);
        window.clearTimeout(timeoutId);

        switch (key) {
          case 'h':
            navigate('/');
            break;
          case 'a':
            navigate('/analytics');
            break;
          case 'p':
            navigate('/plans');
            break;
          case 'c':
            navigate('/crews');
            break;
          case 'u':
            navigate('/audit');
            break;
          case 's':
            navigate('/safety');
            break;
          case 'd':
            navigate('/design');
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timeoutId);
    };
  }, [gPressed, navigate, options]);

  return { gPressed };
}
