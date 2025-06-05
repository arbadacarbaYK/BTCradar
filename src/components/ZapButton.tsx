import React, { useState } from 'react';
import { sendZap } from '../utils/nostr';
import { useUserStore } from '../store/userStore';
import { ConferenceGroup } from '../types/index';
import { QRCodeSVG } from 'qrcode.react';

interface ZapButtonProps {
  recipientPubkey: string;
  recipientName?: string;
  group: ConferenceGroup;
}

const DEFAULT_AMOUNTS = [21, 69, 420, 1000];

// Common wallet deep links
const WALLET_LINKS = [
  {
    name: 'Phoenix',
    getUrl: (invoice: string) => `phoenix:${invoice}`,
    icon: '🔥'
  },
  {
    name: 'Muun',
    getUrl: (invoice: string) => `muun:lightning:${invoice}`,
    icon: '🌙'
  },
  {
    name: 'BlueWallet',
    getUrl: (invoice: string) => `bluewallet:lightning:${invoice}`,
    icon: '💙'
  },
  {
    name: 'Zeus',
    getUrl: (invoice: string) => `zeusln:lightning:${invoice}`,
    icon: '⚡'
  },
  {
    name: 'Wallet of Satoshi',
    getUrl: (invoice: string) => `walletofsatoshi:lightning:${invoice}`,
    icon: '👛'
  }
];

// Add global type for window.webln
declare global {
  interface Window {
    webln?: {
      enable: () => Promise<void>;
      sendPayment: (invoice: string) => Promise<void>;
    };
  }
}

export const ZapButton: React.FC<ZapButtonProps> = ({ 
  recipientPubkey, 
  recipientName, 
  group 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const pubkey = useUserStore(state => state.pubkey) || '';
  const privateKey = useUserStore(state => state.privateKey) || null;

  const handleZap = async (amount: number) => {
    setLoading(true);
    setError(null);
    setInvoice(null);

    try {
      const result = await sendZap(
        privateKey, // pass privateKey for fallback signing
        pubkey,
        recipientPubkey,
        amount,
        comment,
        group.id
      );

      if (result.success) {
        setInvoice(result.message);
        
        // If WebLN is available, try that first
        if (typeof window.webln !== 'undefined') {
          try {
            await window.webln.enable();
            await window.webln.sendPayment(result.message);
            handleSuccess();
          } catch {
            // Don't set error, just fall back to showing QR/options
          }
        }
      } else {
        setError(result.message);
      }
    } catch (e) {
      setError('Failed to send zap');
      console.error('Zap error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setIsOpen(false);
    setComment('');
    setCustomAmount('');
    setInvoice(null);
  };

  const copyInvoice = async () => {
    if (!invoice) return;
    try {
      await navigator.clipboard.writeText(invoice);
      setError('Invoice copied to clipboard!');
    } catch {
      setError('Failed to copy invoice');
    }
  };

  const openWalletLink = (getUrl: (invoice: string) => string) => {
    if (!invoice) return;
    window.location.href = getUrl(invoice);
  };

  // Add Escape key and background close logic
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Reset modal state on close
  const handleClose = () => {
    setIsOpen(false);
    setComment('');
    setCustomAmount('');
    setInvoice(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-bold rounded-lg text-white bg-[#F7931A] hover:bg-[#E78008] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F7931A] shadow-lg"
      >
        ⚡️ Zap {recipientName || 'User'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleClose}>
          <div
            className="relative w-full max-w-xl min-w-[90vw] pt-20 pb-24 md:pt-32 md:pb-32 rounded-2xl shadow-2xl bg-[#181A20] border-2 border-[#8B5CF6]/30 p-3 md:p-6 mx-2 animate-fade-in max-h-[90vh] overflow-y-auto text-sm"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-[#F7931A] text-2xl font-bold focus:outline-none"
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-extrabold text-[#F7931A] mb-4 text-center tracking-tight">Zap {recipientName || 'User'}</h2>
            {!invoice ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4 max-sm:grid-cols-1 text-sm">
                  {DEFAULT_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => handleZap(amount)}
                      disabled={loading}
                      className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-bold rounded-lg text-white bg-[#8B5CF6] hover:bg-[#F7931A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B5CF6] disabled:opacity-50 shadow"
                    >
                      {amount} sats
                    </button>
                  ))}
                </div>
                <div className="mb-4 flex flex-col sm:flex-row items-stretch gap-2 text-sm">
                  <input
                    type="number"
                    min="1"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[#8B5CF6]/30 bg-[#23262F] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                  />
                  <button
                    onClick={() => customAmount && handleZap(Number(customAmount))}
                    disabled={loading || !customAmount}
                    className="px-4 py-2 rounded-lg bg-[#F7931A] text-white font-bold hover:bg-[#E78008] focus:outline-none focus:ring-2 focus:ring-[#F7931A] disabled:opacity-50 shadow"
                  >
                    Zap
                  </button>
                </div>
                <textarea
                  className="w-full rounded-lg border border-[#8B5CF6]/30 bg-[#23262F] text-white placeholder-gray-400 px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] text-sm"
                  placeholder="Add a comment (optional)"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={2}
                  maxLength={200}
                />
                {error && (
                  <div className="text-sm text-red-400 mb-2 font-bold">
                    {error === 'Failed to create zap request' ? (
                      <>Unable to sign zap request. Please login with a NIP-07 extension or nsec/hex key.</>
                    ) : error}
                  </div>
                )}
                {loading && (
                  <div className="text-sm text-[#8B5CF6] font-bold animate-pulse">Processing...</div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col items-center mb-4 text-sm">
                  <QRCodeSVG value={invoice} size={200} bgColor="#fff" fgColor="#000" />
                  <div className="mt-4 text-center text-white font-bold text-base md:text-lg break-all flex flex-col items-center w-full">
                    <div className="flex items-center gap-2 w-full justify-center text-sm">
                      <span className="truncate max-w-[220px]" title={invoice}>{invoice.slice(0, 12)}...{invoice.slice(-8)}</span>
                      <button
                        onClick={copyInvoice}
                        className="ml-1 p-1 rounded bg-[#23262F] hover:bg-[#8B5CF6] text-[#F7931A] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                        title="Copy invoice"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7 8h6a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 justify-center text-sm">
                    {WALLET_LINKS.map((wallet) => (
                      <button
                        key={wallet.name}
                        onClick={() => openWalletLink(wallet.getUrl)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#23262F] text-[#F7931A] font-bold hover:bg-[#8B5CF6] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#8B5CF6] shadow"
                      >
                        <span>{wallet.icon}</span> {wallet.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSuccess}
                  className="w-full mt-2 px-4 py-2 rounded-lg bg-[#F7931A] text-white font-bold hover:bg-[#8B5CF6] focus:outline-none focus:ring-2 focus:ring-[#F7931A] shadow text-sm"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 