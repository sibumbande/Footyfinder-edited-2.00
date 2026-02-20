import React, { useState } from 'react';
import { Wallet, ArrowUpRight, Plus } from 'lucide-react';
import { Modal } from './Modal';

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  teamName: string;
  personalBalance: number;
}

export const FundingModal: React.FC<FundingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  teamName,
  personalBalance
}) => {
  const [fundAmount, setFundAmount] = useState('100');

  const handleFund = () => {
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) return;
    onConfirm(amount);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Fund Treasury"
      subtitle={`Support ${teamName}`}
      accentColor="bg-amber-500"
    >
      <div className="space-y-8">
        <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contribution Amount (ZAR)</label>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-slate-900">R</span>
            <input
              type="number"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="bg-transparent border-none text-4xl font-black text-slate-900 outline-none w-full"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100">
          <Wallet className="text-blue-600 shrink-0" size={24} />
          <div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">From Personal Wallet</p>
            <p className="text-sm font-black text-blue-900">Current Balance: R{personalBalance.toFixed(2)}</p>
          </div>
        </div>

        <button
          onClick={handleFund}
          className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-[0.2em] text-sm shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-4"
        >
          Confirm Transfer <ArrowUpRight size={20} />
        </button>
      </div>
    </Modal>
  );
};
