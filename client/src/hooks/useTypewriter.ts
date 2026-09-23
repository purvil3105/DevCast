import { useEffect, useState } from 'react';

interface TypewriterOptions {
  typingSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
}

export function useTypewriter(
  phrases: string[],
  {
    typingSpeed = 65,
    deleteSpeed = 35,
    pauseDuration = 2200,
  }: TypewriterOptions = {}
): { text: string; isTyping: boolean } {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!phrases.length) return;

    const currentPhrase = phrases[phraseIndex % phrases.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && text === currentPhrase) {
      // Finished typing current phrase, pause before deleting
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, pauseDuration);
    } else if (isDeleting && text === '') {
      // Finished deleting, move to next phrase
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    } else if (isDeleting) {
      // Deleting characters
      timeout = setTimeout(() => {
        setText((prev) => prev.slice(0, -1));
      }, deleteSpeed);
    } else {
      // Typing characters
      timeout = setTimeout(() => {
        setText(currentPhrase.slice(0, text.length + 1));
      }, typingSpeed);
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases, typingSpeed, deleteSpeed, pauseDuration]);

  return { text, isTyping: !isDeleting };
}
