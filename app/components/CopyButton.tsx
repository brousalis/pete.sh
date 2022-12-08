import React, { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false);

  async function copyTextToClipboard(text) {
    if ('clipboard' in navigator) {
      return await navigator.clipboard.writeText(text);
    } else {
      return document.execCommand('copy', true, text);
    }
  }

  const handleCopyClick = async () => {
    try {
      const copy = await copyTextToClipboard(text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopyClick}
      className="rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 active:bg-green-100"
    >
      copy <span className="ml-1">{isCopied ? '✔️' : '📋'}</span>
    </button>
  );
}

export default CopyButton;
