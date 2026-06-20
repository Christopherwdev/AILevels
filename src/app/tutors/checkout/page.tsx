"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { CreditCard, Calendar, Clock, ArrowLeft, Check, Shield, Lock } from 'lucide-react';

interface BookingData {
  tutorId: string;
  tutorName: string;
  hourlyRate: number;
  currency: string;
  slots: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const saved = localStorage.getItem('checkout_booking');
      if (!saved) {
        router.push('/tutors');
        return;
      }

      try {
        setBooking(JSON.parse(saved));
      } catch {
        router.push('/tutors');
        return;
      }
      setLoading(false);
    }
    init();
  }, [router, supabase]);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 2) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setProcessing(true);
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2500));
    setProcessing(false);
    setCompleted(true);
    localStorage.removeItem('checkout_booking');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Checkout...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center">
            <Check size={36} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Booking Confirmed!</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your tutoring sessions with <strong className="text-zinc-900 dark:text-zinc-100">{booking?.tutorName}</strong> have been booked successfully.
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-4 space-y-2">
            {booking?.slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <Calendar size={12} className="text-blue-500" />
                <span className="font-semibold">{slot}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-400">A confirmation email has been sent to your account.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-xs font-bold rounded-xl hover:opacity-90 transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const total = booking.slots.length * booking.hourlyRate;
  const serviceFee = Math.round(total * 0.05 * 100) / 100;
  const grandTotal = total + serviceFee;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/tutors')}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Tutors
        </button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-500" />
                Payment Details
              </h2>
              <p className="text-[11px] text-zinc-400 mb-6">Your payment information is secured with SSL encryption.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Card Number
                  </label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    required
                    className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={e => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      required
                      className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      CVC
                    </label>
                    <input
                      type="text"
                      value={cvc}
                      onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="123"
                      required
                      className="w-full px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 mt-6"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Lock size={14} />
                      Pay £{grandTotal.toFixed(2)}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[9px] text-zinc-400 mt-3">
                  <Shield size={10} />
                  <span>Secured by 256-bit SSL encryption</span>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6 sticky top-24">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">Booking Summary</h3>

              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
                    👨‍🏫
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{booking.tutorName}</p>
                    <p className="text-[10px] text-zinc-400">£{booking.hourlyRate}/hr</p>
                  </div>
                </div>

                {booking.slots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <Clock size={11} className="text-blue-500" />
                      {slot}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">£{booking.hourlyRate}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Subtotal ({booking.slots.length} session{booking.slots.length > 1 ? 's' : ''})</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Service fee (5%)</span>
                  <span>£{serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Total</span>
                  <span>£{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
