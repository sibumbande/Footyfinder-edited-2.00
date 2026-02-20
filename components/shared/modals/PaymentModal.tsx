
import React from 'react';
import { X, CheckCircle2, Loader2, Zap, Lock, CreditCard } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  title: string;
  description: string;
  status: 'IDLE' | 'PROCESSING' | 'SUCCESS';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  amount,
  title,
  description,
  status
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
       <div className="bg-white rounded-[56px] p-16 max-w-md w-full shadow-3xl animate-scale-in relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-3 bg-blue-600"></div>
          
          {status === 'SUCCESS' ? (
            <div className="py-12 flex flex-col items-center animate-fade-in text-center">
               <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <CheckCircle2 size={48} className="animate-bounce" />
               </div>
               <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">Payment Secured!</h2>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Updating status...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-12">
                 <div>
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{title}</h2>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{description}</p>
                 </div>
                 <button onClick={onClose} disabled={status === 'PROCESSING'} className="text-slate-300 hover:text-slate-900 transition-colors"><X size={32}/></button>
              </div>

              <div className="bg-slate-50 rounded-[40px] p-10 mb-12 border border-slate-100">
                 <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">R{amount.toFixed(2)}</span>
                 </div>
                 <div className="pt-6 border-t border-slate-200 flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                    <Lock size={14}/> Secure Escrow Transaction
                 </div>
              </div>

              <button 
                onClick={onConfirm} 
                disabled={status === 'PROCESSING'}
                className="w-full py-8 bg-slate-900 text-white rounded-[32px] font-black uppercase tracking-widest text-sm shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-4 active:scale-95 disabled:opacity-50"
              >
                {status === 'PROCESSING' ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <Zap size={20} /> Authorize Payment
                  </>
                )}
              </button>
              
              <div className="mt-8 flex justify-center items-center gap-4 text-slate-300">
                <CreditCard size={20} />
                <span className="text-[8px] font-bold uppercase tracking-widest">EFT / Credit / Debit</span>
              </div>
            </>
          )}
       </div>
    </div>
  );
};
