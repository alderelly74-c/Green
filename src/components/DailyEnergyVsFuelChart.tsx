import React, { useState } from 'react';
import { TrendingDown, Zap, Fuel, DollarSign, Download, Calendar, Sparkles, ArrowDownRight, Info } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Area, ComposedChart } from 'recharts';
import { toast } from 'sonner';

export interface DailyExpenditurePoint {
  day: string;
  dateStr: string;
  evEnergyCostKes: number;
  fuelExpenditureKes: number;
  dailySavingsKes: number;
  cumulativeSavingsKes: number;
  evKmDriven: number;
  fuelKmDriven: number;
}

// Generate realistic 30-day daily telemetry (July 11 - August 9, 2026)
const generate30DayData = (): DailyExpenditurePoint[] => {
  const data: DailyExpenditurePoint[] = [];
  let runningSavings = 0;

  const baseDate = new Date(2026, 6, 11); // July 11, 2026

  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(baseDate.getDate() + i);

    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const dayName = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Weekend vs Weekday fleet delivery load factor
    const loadFactor = isWeekend ? 0.72 : 1.0;
    
    // EV km driven across active fleet (~38 EV bikes, avg 110-140 km/day each)
    const evKmDriven = Math.round((4800 + (i % 7) * 220 - (i % 5) * 150) * loadFactor);
    // Fuel km driven across fuel fleet (~40 fuel bikes, avg 100-130 km/day each)
    const fuelKmDriven = Math.round((4600 + (i % 6) * 200 - (i % 4) * 180) * loadFactor);

    // EV energy cost @ ~KES 2.3/km (charging + Spiro/Roam battery swap fees)
    const evEnergyCostKes = Math.round(evKmDriven * (2.25 + (i % 3) * 0.08));

    // Fuel expenditure @ ~KES 9.1/km (Petrol @ KES 212/L)
    const fuelExpenditureKes = Math.round(fuelKmDriven * (8.90 + (i % 4) * 0.25));

    const dailySavingsKes = fuelExpenditureKes - evEnergyCostKes;
    runningSavings += dailySavingsKes;

    data.push({
      day: dayName,
      dateStr: fullDate,
      evEnergyCostKes,
      fuelExpenditureKes,
      dailySavingsKes,
      cumulativeSavingsKes: runningSavings,
      evKmDriven,
      fuelKmDriven
    });
  }

  return data;
};

const dailyTelemetryData = generate30DayData();

export const DailyEnergyVsFuelChart: React.FC = () => {
  const [dataFilter, setDataFilter] = useState<'30D' | '14D' | '7D'>('30D');
  const [showCumulativeArea, setShowCumulativeArea] = useState<boolean>(true);

  const displayedData = React.useMemo(() => {
    if (dataFilter === '14D') return dailyTelemetryData.slice(-14);
    if (dataFilter === '7D') return dailyTelemetryData.slice(-7);
    return dailyTelemetryData;
  }, [dataFilter]);

  const totalEvCost = displayedData.reduce((a, d) => a + d.evEnergyCostKes, 0);
  const totalFuelCost = displayedData.reduce((a, d) => a + d.fuelExpenditureKes, 0);
  const totalSavings = totalFuelCost - totalEvCost;
  const savingsPercent = Math.round((totalSavings / totalFuelCost) * 100);

  const avgDailyEvCost = Math.round(totalEvCost / displayedData.length);
  const avgDailyFuelCost = Math.round(totalFuelCost / displayedData.length);
  const avgDailySavings = avgDailyFuelCost - avgDailyEvCost;

  const exportCsv = () => {
    const headers = "Date,EV Daily Energy Cost (KES),Fuel Daily Pump Cost (KES),Daily Savings (KES),Cumulative Savings (KES),EV Distance (KM),Fuel Distance (KM)\n";
    const rows = displayedData.map(d => 
      `"${d.dateStr}",${d.evEnergyCostKes},${d.fuelExpenditureKes},${d.dailySavingsKes},${d.cumulativeSavingsKes},${d.evKmDriven},${d.fuelKmDriven}`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GreenShift_Daily_Energy_vs_Fuel_Cost_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Downloaded Daily Energy vs Fuel Expenditure Report CSV');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                Daily Energy Cost vs Fuel Expenditure (Last 30 Days)
              </h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full">
                Multi-Series Line Analysis
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily operational expenditure tracking showing instant savings generated by electric battery swaps & charging vs petrol pump prices.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center text-xs font-semibold">
            <button
              onClick={() => setDataFilter('30D')}
              className={`px-3 py-1 rounded-md transition ${dataFilter === '30D' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDataFilter('14D')}
              className={`px-3 py-1 rounded-md transition ${dataFilter === '14D' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              14 Days
            </button>
            <button
              onClick={() => setDataFilter('7D')}
              className={`px-3 py-1 rounded-md transition ${dataFilter === '7D' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
            >
              7 Days
            </button>
          </div>

          <button
            onClick={() => setShowCumulativeArea(!showCumulativeArea)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border flex items-center gap-1.5 ${
              showCumulativeArea 
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{showCumulativeArea ? 'Cumulative Savings Active' : 'Show Cumulative Savings'}</span>
          </button>

          <button
            onClick={exportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* HIGHLIGHTED STATS STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>EV Energy Spent ({dataFilter})</span>
            </span>
            <span className="text-emerald-400 text-[10px] bg-emerald-500/20 font-bold px-1.5 py-0.5 rounded">
              Avg KES {avgDailyEvCost.toLocaleString()}/day
            </span>
          </div>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1.5">
            KES {totalEvCost.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Fuel className="w-4 h-4 text-amber-400" />
              <span>Fuel Pump Spent ({dataFilter})</span>
            </span>
            <span className="text-amber-400 text-[10px] bg-amber-500/20 font-bold px-1.5 py-0.5 rounded">
              Avg KES {avgDailyFuelCost.toLocaleString()}/day
            </span>
          </div>
          <div className="text-xl font-black text-amber-400 font-mono mt-1.5">
            KES {totalFuelCost.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Net Energy Savings</span>
            </span>
            <span className="text-cyan-400 text-[10px] bg-cyan-500/20 font-bold px-1.5 py-0.5 rounded">
              -{savingsPercent}% Cost
            </span>
          </div>
          <div className="text-xl font-black text-cyan-300 font-mono mt-1.5">
            KES {totalSavings.toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-slate-300">
              <TrendingDown className="w-4 h-4 text-indigo-400" />
              <span>Daily Savings Rate</span>
            </span>
            <span className="text-indigo-300 text-[10px] bg-indigo-500/20 font-bold px-1.5 py-0.5 rounded">
              Direct Margin Lift
            </span>
          </div>
          <div className="text-xl font-black text-indigo-300 font-mono mt-1.5">
            +KES {avgDailySavings.toLocaleString()} / day
          </div>
        </div>
      </div>

      {/* RECHARTS MULTI-SERIES LINE & AREA CHART */}
      <div className="h-80 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={displayedData} margin={{ top: 15, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis 
              stroke="#64748b" 
              fontSize={11} 
              tickLine={false} 
              tickFormatter={(val) => `KES ${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const item = displayedData.find(d => d.day === label);
                  if (!item) return null;

                  return (
                    <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-64">
                      <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{item.dateStr}</span>
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded">
                          -{Math.round((item.dailySavingsKes / item.fuelExpenditureKes) * 100)}% Cost Drop
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            EV Energy Cost:
                          </span>
                          <strong className="font-mono">KES {item.evEnergyCostKes.toLocaleString()}</strong>
                        </div>

                        <div className="flex items-center justify-between text-amber-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                            Fuel Pump Expenditure:
                          </span>
                          <strong className="font-mono">KES {item.fuelExpenditureKes.toLocaleString()}</strong>
                        </div>

                        <div className="flex items-center justify-between text-cyan-300 font-bold pt-1 border-t border-slate-800">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            Daily Energy Savings:
                          </span>
                          <strong className="font-mono text-cyan-400">+KES {item.dailySavingsKes.toLocaleString()}</strong>
                        </div>

                        <div className="flex items-center justify-between text-indigo-300 font-semibold">
                          <span>Cumulative 30-Day Savings:</span>
                          <strong className="font-mono">KES {item.cumulativeSavingsKes.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2 rounded text-[11px] text-slate-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span>EV Distance Driven:</span>
                          <span className="text-slate-200 font-mono">{item.evKmDriven.toLocaleString()} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Fuel Distance Driven:</span>
                          <span className="text-slate-200 font-mono">{item.fuelKmDriven.toLocaleString()} km</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              formatter={(value) => {
                if (value === 'evEnergyCostKes') return <span className="text-emerald-400 font-bold">EV Battery Charging & Swap Cost (KES)</span>;
                if (value === 'fuelExpenditureKes') return <span className="text-amber-400 font-bold">Fuel Fleet Petrol Pump Expense (KES)</span>;
                if (value === 'cumulativeSavingsKes') return <span className="text-cyan-300 font-bold">Cumulative Net Energy Savings (KES)</span>;
                return value;
              }}
            />

            {showCumulativeArea && (
              <Area 
                type="monotone" 
                dataKey="cumulativeSavingsKes" 
                fill="#06b6d4" 
                stroke="#06b6d4" 
                fillOpacity={0.08} 
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            )}

            <Line 
              type="monotone" 
              dataKey="fuelExpenditureKes" 
              stroke="#f59e0b" 
              strokeWidth={2.5} 
              dot={{ fill: '#f59e0b', r: 3 }} 
              activeDot={{ r: 6 }}
            />

            <Line 
              type="monotone" 
              dataKey="evEnergyCostKes" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ fill: '#10b981', r: 3 }} 
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Electric fleet operates at an average energy cost of <strong className="text-emerald-400">KES 2.25/km</strong> compared to fuel at <strong className="text-amber-400">KES 9.10/km</strong>, producing an immediate <strong className="text-cyan-300">75% cost reduction</strong>.
          </span>
        </div>
      </div>

    </div>
  );
};
