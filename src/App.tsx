/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Shield, 
  Zap, 
  Heart, 
  Flame, 
  ChevronRight, 
  Info,
  ArrowRight,
  Sparkles,
  Gem,
  ShoppingBag,
  TrendingUp,
  Clock,
  Send
} from 'lucide-react';
import { LEVEL_DATA } from './constants';

interface Relic {
  id: string;
  name: string;
  level: number;
  icon: React.ReactNode;
  color: string;
}

export default function App() {
  const [activeRelicId, setActiveRelicId] = useState('destruction');
  const [selectedChestTier, setSelectedChestTier] = useState<string>('T5');
  const [marketPrices, setMarketPrices] = useState<Record<string, { pieces: number, price: number, lastUpdated: number }>>({});
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('USDT');
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USDT: 1 });
  const [expandedRelic, setExpandedRelic] = useState<string | null>(null);
  const [isEnhancementExpanded, setIsEnhancementExpanded] = useState(true);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => {
        setExchangeRates({
          USDT: 1,
          IDR: data.rates.IDR,
          JPY: data.rates.JPY,
          KRW: data.rates.KRW,
          PHP: data.rates.PHP,
          THB: data.rates.THB,
          VND: data.rates.VND,
          MYR: data.rates.MYR,
          SGD: data.rates.SGD,
          TWD: data.rates.TWD,
          HKD: data.rates.HKD,
          CNY: data.rates.CNY,
        });
      })
      .catch(err => console.error('Failed to fetch exchange rates:', err));
  }, []);

  const formatCurrency = (amountInUSDT: number) => {
    const rate = exchangeRates[selectedCurrency] || 1;
    const converted = amountInUSDT * rate;
    
    if (selectedCurrency === 'USDT') {
      return `${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
    }
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: selectedCurrency,
        minimumFractionDigits: ['IDR', 'VND', 'KRW', 'JPY'].includes(selectedCurrency) ? 0 : 2,
        maximumFractionDigits: ['IDR', 'VND', 'KRW', 'JPY'].includes(selectedCurrency) ? 0 : 2,
      }).format(converted);
    } catch (e) {
      return `${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${selectedCurrency}`;
    }
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'INIT' || payload.type === 'UPDATE') {
        setMarketPrices(payload.data);
      }
    };

    setSocket(ws);
    return () => ws.close();
  }, []);

  const submitPrice = (tier: string, price: number) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'UPDATE_PRICE', data: { tier, price } }));
    }
  };
  
  // Manage levels for each relic individually
  const [relicLevels, setRelicLevels] = useState<Record<string, { current: number, target: number }>>({
    destruction: { current: 60, target: 61 },
    protection: { current: 56, target: 57 },
    life: { current: 40, target: 41 },
  });

  const [relics] = useState<Relic[]>([
    { id: 'destruction', name: 'Origin of Destruction', level: 60, icon: <Flame className="w-6 h-6" />, color: '#FF4D4D' },
    { id: 'protection', name: 'Barrier Protection', level: 56, icon: <Shield className="w-6 h-6" />, color: '#4D94FF' },
    { id: 'life', name: 'Crystal of Life', level: 40, icon: <Heart className="w-6 h-6" />, color: '#4DFF88' },
  ]);

  const activeRelic = relics.find(r => r.id === activeRelicId) || relics[0];

  const relicCalculations = useMemo(() => {
    const results: Record<string, { totalCost: number, nextLevelCost: number, diff: number }> = {};
    relics.forEach((relic) => {
      const levels = relicLevels[relic.id];
      const start = Math.max(1, Math.min(levels.current, 100));
      const end = Math.max(start, Math.min(levels.target, 100));
      
      let cost = 0;
      for (let i = start; i < end; i++) {
        cost += LEVEL_DATA[i] || 0;
      }
      
      results[relic.id] = {
        totalCost: cost,
        nextLevelCost: LEVEL_DATA[levels.current] || 0,
        diff: end - start
      };
    });
    return results;
  }, [relicLevels, relics]);

  const grandTotal = useMemo(() => {
    const values = Object.values(relicCalculations) as { totalCost: number }[];
    return values.reduce((sum, calc) => sum + calc.totalCost, 0);
  }, [relicCalculations]);

  const handleLevelChange = (id: string, type: 'current' | 'target', value: number) => {
    setRelicLevels(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [type]: Math.min(100, Math.max(1, value))
      }
    }));
  };

  const activeCalc = relicCalculations[activeRelicId];
  const activeLevels = relicLevels[activeRelicId];

  const bestEfficiency = useMemo(() => {
    const efficiencies = Object.values(marketPrices)
      .map(d => (d as { price: number, pieces: number }).price / (d as { price: number, pieces: number }).pieces)
      .filter(e => e > 0);
    return efficiencies.length > 0 ? Math.min(...efficiencies) : 0;
  }, [marketPrices]);

  return (
    <div className="min-h-screen bg-[#050506] text-[#E0E0E0] font-sans overflow-hidden relative selection:bg-[#D4AF37] selection:text-black">
      {/* Background Atmosphere */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-red-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="relative z-10 flex min-h-screen items-start justify-center p-4">
        
        {/* Main Dashboard Container */}
        <div className="w-full flex flex-col glass-panel rounded-[32px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          
          {/* Top Navigation Bar */}
          <header className="flex items-center justify-between px-10 py-6 border-b border-white/5 bg-white/5">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <div className="flex flex-col">
                <h1 className="font-display text-sm tracking-[0.4em] text-white uppercase">CALCULATOR RELIC LORDNINE</h1>
                <span className="text-[9px] font-display tracking-[0.3em] text-[#D4AF37] uppercase mt-1">Server Medea</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-display tracking-[0.2em] text-white/40 uppercase">Currency:</span>
              <select 
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono outline-none focus:border-[#D4AF37]/50 text-[#D4AF37]"
              >
                {Object.keys(exchangeRates).map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </div>
          </header>

          <div className="flex-1 flex flex-col">
            {/* Centered Relic Selection Bar */}
            <div className="px-10 py-8 border-b border-white/5 bg-black/20">
              <div className="flex justify-center gap-6">
                {relics.map((relic) => (
                  <button
                    key={relic.id}
                    onClick={() => setActiveRelicId(relic.id)}
                    className={`group relative flex flex-col items-center gap-3 p-4 min-w-[160px] rounded-2xl transition-all ${
                      activeRelicId === relic.id 
                        ? 'bg-white/5 border border-[#D4AF37]/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]' 
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div 
                      className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${
                        activeRelicId === relic.id ? 'border-[#D4AF37] bg-black scale-110' : 'border-white/10 bg-white/5'
                      }`}
                      style={{ color: relic.color }}
                    >
                      {relic.icon}
                    </div>
                    <div className="text-center">
                      <div className={`text-[10px] font-display tracking-[0.2em] uppercase transition-colors ${activeRelicId === relic.id ? 'text-white' : 'text-white/40'}`}>
                        {relic.name}
                      </div>
                      <div className="text-[9px] font-mono opacity-30 mt-1">Lv. {relicLevels[relic.id].current}</div>
                    </div>
                    {activeRelicId === relic.id && (
                      <motion.div 
                        layoutId="active-glow"
                        className="absolute -inset-1 rounded-2xl border border-[#D4AF37]/20 pointer-events-none"
                        initial={false}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex">
              {/* Left Section: Calculator & Breakdown */}
              <div className="w-1/2 border-r border-white/5 flex flex-col p-10 space-y-10">
                <div className="space-y-10">
                  {/* Enhancement Protocol Section */}
                  <section className="bg-black/40 rounded-[32px] border border-white/5 shadow-inner overflow-hidden transition-all duration-300">
                    <button 
                      onClick={() => setIsEnhancementExpanded(!isEnhancementExpanded)}
                      className="w-full flex items-center justify-between p-10 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                        <h3 className="text-[10px] font-display tracking-[0.3em] text-[#D4AF37] uppercase">Enhancement Protocol</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] opacity-20 uppercase tracking-widest">Active: {activeRelic.name}</span>
                        <ChevronRight className={`w-4 h-4 text-[#D4AF37]/40 transition-transform duration-300 ${isEnhancementExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                    
                    {isEnhancementExpanded && (
                      <div className="px-10 pb-10 space-y-8">
                        <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-[9px] uppercase tracking-widest opacity-40 block ml-1">Current Level</label>
                            <input 
                              type="number" 
                              value={activeLevels.current}
                              onChange={(e) => handleLevelChange(activeRelicId, 'current', parseInt(e.target.value) || 1)}
                              className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-base font-mono focus:border-[#D4AF37]/50 outline-none transition-all focus:ring-1 focus:ring-[#D4AF37]/20"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[9px] uppercase tracking-widest opacity-40 block ml-1">Target Level</label>
                            <input 
                              type="number" 
                              value={activeLevels.target}
                              onChange={(e) => handleLevelChange(activeRelicId, 'target', parseInt(e.target.value) || 1)}
                              className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-base font-mono focus:border-[#D4AF37]/50 outline-none transition-all focus:ring-1 focus:ring-[#D4AF37]/20"
                            />
                          </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex items-end justify-between">
                          <div>
                            <div className="text-[9px] uppercase tracking-widest opacity-40 mb-2">Required Pieces</div>
                            <div className="text-5xl font-mono font-bold gold-gradient-text tracking-tighter">
                              {activeCalc.totalCost.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] uppercase tracking-widest opacity-20 mb-1">Next Level</div>
                            <div className="text-sm font-mono opacity-40">{activeCalc.nextLevelCost.toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Relic Summary Section (Moved to Left) */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-4 h-4 text-white/20" />
                      <h4 className="text-[10px] font-display tracking-[0.2em] text-white/40 uppercase">Relic Breakdown</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {relics.map((relic) => {
                        const calc = relicCalculations[relic.id];
                        const levels = relicLevels[relic.id];
                        const isExpanded = expandedRelic === relic.id;
                        return (
                          <div key={relic.id} className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden transition-all duration-300">
                            <button 
                              onClick={() => setExpandedRelic(isExpanded ? null : relic.id)}
                              className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black border border-white/10 shadow-inner" style={{ color: relic.color }}>
                                  {React.cloneElement(relic.icon as React.ReactElement, { className: 'w-4 h-4' })}
                                </div>
                                <h4 className="text-[10px] font-display tracking-[0.2em] text-white/80 uppercase">{relic.name}</h4>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-[10px] font-mono text-[#4DFF88]">Lv. {levels.current} → {levels.target}</div>
                                <ChevronRight className={`w-4 h-4 text-white/40 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                              </div>
                            </button>
                            
                            {isExpanded && (
                              <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-black/20">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] opacity-40 uppercase tracking-widest">Required Pieces</span>
                                  <div className="text-right">
                                    <div className="font-mono text-sm text-[#D4AF37]">{calc.totalCost.toLocaleString()}</div>
                                    {bestEfficiency > 0 && (
                                      <div className="text-[9px] font-mono text-white/30">
                                        ≈ {formatCurrency(calc.totalCost * bestEfficiency)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>

              {/* Right Section: Analysis & Totals */}
              <div className="w-1/2 flex flex-col p-10 bg-black/20 space-y-10">
                <div className="flex-1 space-y-10">

                {/* Total Cost Estimation Card */}
                <div className="bg-gradient-to-br from-[#D4AF37]/20 to-transparent rounded-[32px] p-8 border border-[#D4AF37]/30 shadow-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                    <h4 className="text-[11px] font-display tracking-[0.3em] text-[#D4AF37] uppercase">Total Cost Projection</h4>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[9px] opacity-40 uppercase tracking-widest mb-1">Total Pieces Needed</span>
                        <span className="text-2xl font-mono font-bold text-white">{grandTotal.toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] opacity-40 uppercase tracking-widest mb-1">Best Market Efficiency</span>
                        <div className="text-sm font-mono text-[#4DFF88]">
                          {bestEfficiency > 0 ? bestEfficiency.toFixed(4) : '---'}
                          <span className="text-[8px] ml-1 opacity-40">/ Piece</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chest Breakdown & Market Price Section */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-white/40" />
                      <h4 className="text-[10px] font-display tracking-[0.2em] text-white/80 uppercase">Chest Analysis & Market</h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <select 
                        value={selectedChestTier}
                        onChange={(e) => setSelectedChestTier(e.target.value)}
                        className="bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono outline-none focus:border-[#D4AF37]/50 text-[#D4AF37]"
                      >
                        {Object.keys(marketPrices).sort((a, b) => (marketPrices[b].pieces - marketPrices[a].pieces)).map(tier => (
                          <option key={tier} value={tier}>{tier} Chest</option>
                        ))}
                      </select>
                      {marketPrices[selectedChestTier] && (
                        <div className="text-[9px] font-mono text-white/30">
                          Price: {marketPrices[selectedChestTier].price > 0 ? formatCurrency(marketPrices[selectedChestTier].price) : 'Fetching...'} / Chest
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {marketPrices[selectedChestTier] ? (() => {
                      const marketData = marketPrices[selectedChestTier];
                      const quantity = Math.ceil(grandTotal / marketData.pieces);
                      return (
                        <>
                          <div className="flex items-center justify-between bg-[#D4AF37]/5 rounded-xl p-6 border border-[#D4AF37]/20 shadow-[0_0_20px_rgba(212,175,55,0.05)]">
                            <div className="flex flex-col">
                              <span className="text-base font-bold text-white">{selectedChestTier} Chest</span>
                              <span className="text-[10px] opacity-40 uppercase tracking-widest mt-1">x{marketData.pieces.toLocaleString()} Pieces/Chest</span>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-mono font-bold text-[#D4AF37] tracking-tighter">
                                {quantity.toLocaleString()} <span className="text-xs opacity-40 ml-1 uppercase font-display tracking-widest">Chests</span>
                              </div>
                              {marketData.price > 0 ? (
                                <div className="text-[11px] font-mono text-[#4DFF88] mt-1">
                                  {quantity.toLocaleString()} × {formatCurrency(marketData.price)} = {formatCurrency(quantity * marketData.price)}
                                </div>
                              ) : (
                                <div className="text-[11px] font-mono text-white/30 mt-1">
                                  Fetching price data...
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })() : (
                      <div className="text-center py-8 text-[10px] opacity-30 uppercase tracking-[0.2em]">
                        Select a chest tier to see breakdown
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.3);
        }
        .animate-spin-slow {
          animation: spin 12s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

