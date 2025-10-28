import React, { useState, useMemo, useCallback } from 'react';
import { CalculatorInputs, AdvancedSettings, CalculationResult } from './types';
import InputSlider from './components/InputSlider';
import ResultsCard from './components/ResultsCard';
import LorryIcon from './components/LorryIcon';
import { getLogisticsInsights } from './services/geminiService';
import { SparklesIcon, ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, DocumentArrowDownIcon } from './components/Icons';
import GanttChart from './components/GanttChart';

const formatDecimalHours = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours < 0) return '';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  
  if (parts.length === 0) return '0 minutes';
  return parts.join(' ');
};

const App: React.FC = () => {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    material: 300,
    distance: 20,
    time: 3,
    loadTime: 10,
    startTime: '08:00',
    pricePerTonne: 15,
    costPerLorry: 600,
  });

  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    lorryCapacity: 20,
    avgSpeed: 31,
    tipTime: 5,
  });

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showInsights, setShowInsights] = useState<boolean>(true);
  const [insights, setInsights] = useState<string>('');
  const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleInputChange = useCallback((name: keyof CalculatorInputs, value: number | string) => {
    setInputs(prev => ({ ...prev, [name]: value }));
  }, []);
  
  const handleAdvancedChange = useCallback((name: keyof AdvancedSettings, value: number) => {
    setAdvancedSettings(prev => ({ ...prev, [name]: value }));
  }, []);

  const calculationResult = useMemo<CalculationResult>(() => {
    const { material, distance, time, loadTime, pricePerTonne, costPerLorry } = inputs;
    const { lorryCapacity, avgSpeed, tipTime } = advancedSettings;

    if (lorryCapacity <= 0 || avgSpeed <= 0 || time <= 0 || loadTime <= 0) {
      return { lorriesNeeded: 0, totalTripsNeeded: 0, timePerTrip: 0, tripsPerLorry: 0, totalValue: 0, totalCost: 0, achievableMaterial: 0, achievableValue: 0 };
    }
    
    const totalTripsNeeded = Math.ceil(material / lorryCapacity);
    const travelTimeHours = distance / avgSpeed;
    const roundTripTimeHours = travelTimeHours * 2;
    const loadTimeHours = loadTime / 60;
    const tipTimeHours = tipTime / 60;
    const timePerTrip = roundTripTimeHours + loadTimeHours + tipTimeHours;

    let lorriesNeeded = Infinity;
    const maxLorriesToTest = Math.max(50, totalTripsNeeded);

    for (let numLorries = 1; numLorries <= maxLorriesToTest; numLorries++) {
        const lorriesNextAvailableTime = new Array(numLorries).fill(0);
        let loadingBayFreeAt = 0;
        let possible = true;

        for (let i = 0; i < totalTripsNeeded; i++) {
            const earliestLorryTime = Math.min(...lorriesNextAvailableTime);
            const earliestLorryIdx = lorriesNextAvailableTime.indexOf(earliestLorryTime);
            
            const loadStartTime = Math.max(earliestLorryTime, loadingBayFreeAt);
            const loadEndTime = loadStartTime + loadTimeHours;

            if (loadEndTime > time + 0.0001) {
                possible = false;
                break;
            }
            
            loadingBayFreeAt = loadEndTime;
            
            const lorryReturnTime = loadEndTime + travelTimeHours + tipTimeHours + travelTimeHours;
            lorriesNextAvailableTime[earliestLorryIdx] = lorryReturnTime;
        }

        if (possible) {
            lorriesNeeded = numLorries;
            break;
        }
    }

    if (isFinite(lorriesNeeded)) {
        const tripsPerLorry = lorriesNeeded > 0 ? totalTripsNeeded / lorriesNeeded : 0;
        const totalValue = material * pricePerTonne;
        const totalCost = lorriesNeeded * costPerLorry;
        return { lorriesNeeded, totalTripsNeeded, timePerTrip, tripsPerLorry, totalValue, totalCost };
    } else {
        // Plan is not feasible. Calculate what IS possible.
        const numLorriesForSimulation = maxLorriesToTest;
        let achievableTrips = 0;
        
        // Calculate achievable material
        let lorriesNextAvailableTimeAchievable = new Array(numLorriesForSimulation).fill(0);
        let loadingBayFreeAtAchievable = 0;
        while (true) {
            const earliestLorryTime = Math.min(...lorriesNextAvailableTimeAchievable);
            const earliestLorryIdx = lorriesNextAvailableTimeAchievable.indexOf(earliestLorryTime);
            const loadStartTime = Math.max(earliestLorryTime, loadingBayFreeAtAchievable);
            const loadEndTime = loadStartTime + loadTimeHours;

            if (loadEndTime > time + 0.0001) break;

            achievableTrips++;
            loadingBayFreeAtAchievable = loadEndTime;
            const lorryReturnTime = loadEndTime + travelTimeHours + tipTimeHours + travelTimeHours;
            lorriesNextAvailableTimeAchievable[earliestLorryIdx] = lorryReturnTime;
        }

        // Calculate required time for full target
        let requiredTime = 0;
        let lorriesNextAvailableTimeRequired = new Array(numLorriesForSimulation).fill(0);
        let loadingBayFreeAtRequired = 0;
        for (let i = 0; i < totalTripsNeeded; i++) {
            const earliestLorryTime = Math.min(...lorriesNextAvailableTimeRequired);
            const earliestLorryIdx = lorriesNextAvailableTimeRequired.indexOf(earliestLorryTime);
            const loadStartTime = Math.max(earliestLorryTime, loadingBayFreeAtRequired);
            const loadEndTime = loadStartTime + loadTimeHours;
            
            loadingBayFreeAtRequired = loadEndTime;
            const lorryReturnTime = loadEndTime + travelTimeHours + tipTimeHours + travelTimeHours;
            lorriesNextAvailableTimeRequired[earliestLorryIdx] = lorryReturnTime;
            
            if (i === totalTripsNeeded - 1) {
                requiredTime = loadEndTime;
            }
        }
        
        const achievableMaterial = achievableTrips * lorryCapacity;
        const achievableValue = achievableMaterial * pricePerTonne;

        return {
            lorriesNeeded,
            totalTripsNeeded,
            timePerTrip,
            tripsPerLorry: 0,
            totalValue: material * pricePerTonne,
            totalCost: 0,
            achievableMaterial,
            achievableValue,
            requiredTime: requiredTime > time ? requiredTime : undefined,
        };
    }
  }, [inputs, advancedSettings]);

  const handleGetInsights = async () => {
    setIsLoadingInsights(true);
    setError('');
    setInsights('');
    setShowInsights(true);
    try {
      const result = await getLogisticsInsights(inputs, advancedSettings, calculationResult);
      setInsights(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoadingInsights(false);
    }
  };
  
  const isFeasible = isFinite(calculationResult.lorriesNeeded) && calculationResult.lorriesNeeded > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 relative">
          <div className="flex items-center justify-center gap-4">
             <LorryIcon className="h-12 w-12 text-blue-400" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
              Planing Lorry Logistics Calculator
            </h1>
          </div>
          <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
            Estimate the number of lorries for your job and get AI-powered logistical insights.
          </p>
          <button
            onClick={() => window.print()}
            className="no-print absolute top-0 right-0 flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-all duration-200"
            title="Export as PDF"
          >
            <DocumentArrowDownIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Export as PDF</span>
          </button>
        </header>

        <main className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 border border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 text-teal-300">Job Parameters</h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <label htmlFor="startTime" className="font-medium text-gray-300">Operation Start Time</label>
                    <div className="flex items-center space-x-2 bg-gray-900 rounded-md">
                        <input
                            type="time"
                            id="startTime"
                            value={inputs.startTime}
                            onChange={(e) => handleInputChange('startTime', e.target.value)}
                            className="w-24 bg-transparent text-right font-semibold text-teal-300 focus:outline-none p-1 rounded-md no-print"
                        />
                         <span className="print-only text-lg font-semibold">{inputs.startTime}</span>
                    </div>
                  </div>
                </div>
                <InputSlider label="Total Planing Tonnes" value={inputs.material} min={10} max={2000} step={10} unit="tonnes" onChange={(val) => handleInputChange('material', val)} />
                <InputSlider label="Price per Tonne" value={inputs.pricePerTonne} min={1} max={50} step={1} unit="£" onChange={(val) => handleInputChange('pricePerTonne', val)} />
                <InputSlider label="Cost per Lorry" value={inputs.costPerLorry} min={100} max={1000} step={5} unit="£" onChange={(val) => handleInputChange('costPerLorry', val)} />
                <InputSlider label="Distance to Tip" value={inputs.distance} min={1} max={100} step={1} unit="miles" onChange={(val) => handleInputChange('distance', val)} />
                <InputSlider label="Planing Window" value={inputs.time} min={1} max={12} step={0.25} unit={formatDecimalHours(inputs.time)} onChange={(val) => handleInputChange('time', val)} />
                <InputSlider label="Loading Time per Lorry" value={inputs.loadTime} min={5} max={100} step={1} unit="minutes" onChange={(val) => handleInputChange('loadTime', val)} />
              </div>

              <div className="mt-6 border-t border-gray-700 pt-6">
                  <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex justify-between items-center w-full text-left text-lg font-medium text-gray-300 hover:text-teal-300 transition-colors">
                      <span>Advanced Settings</span>
                      {showAdvanced ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                  </button>
                  {showAdvanced && (
                      <div className="mt-4 space-y-6 animate-fade-in">
                          <InputSlider label="Lorry Capacity" value={advancedSettings.lorryCapacity} min={5} max={40} step={1} unit="tonnes" onChange={(val) => handleAdvancedChange('lorryCapacity', val)} />
                          <InputSlider label="Average Speed" value={advancedSettings.avgSpeed} min={10} max={70} step={1} unit="mph" onChange={(val) => handleAdvancedChange('avgSpeed', val)} />
                          <InputSlider label="Tipping Time" value={advancedSettings.tipTime} min={5} max={60} step={5} unit="minutes" onChange={(val) => handleAdvancedChange('tipTime', val)} />
                      </div>
                  )}
              </div>
            </div>

            {/* Right Column: Results and Insights */}
            <div className="space-y-8">
              <ResultsCard result={calculationResult} inputs={inputs} />
              
              <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 border border-gray-700">
                  <button onClick={() => setShowInsights(!showInsights)} className="flex justify-between items-center w-full text-left text-2xl font-semibold text-teal-300 hover:text-teal-400 transition-colors">
                      <span>AI-Powered Insights</span>
                      {showInsights ? <ChevronUpIcon className="w-6 h-6" /> : <ChevronDownIcon className="w-6 h-6" />}
                  </button>

                  {showInsights && (
                    <div className="mt-4 animate-fade-in">
                      <p className="text-gray-400 mb-4 no-print">Get potential risks, optimization tips, and other factors to consider for your operation.</p>
                      <button
                          onClick={handleGetInsights}
                          disabled={isLoadingInsights}
                          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white font-semibold rounded-lg shadow-md hover:from-blue-600 hover:to-teal-600 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                      >
                          {isLoadingInsights ? (
                              <>
                                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Analyzing...
                              </>
                          ) : (
                              <>
                                  <SparklesIcon className="w-5 h-5" />
                                  Generate Insights
                              </>
                          )}
                      </button>

                      {error && (
                          <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-5 h-5"/> <span>{error}</span>
                          </div>
                      )}

                      {insights && (
                          <div className="mt-6 prose prose-invert prose-sm max-w-none text-gray-300 animate-fade-in" dangerouslySetInnerHTML={{ __html: insights }} />
                      )}
                    </div>
                  )}
              </div>
            </div>
          </div>
          
          {/* Full-width Gantt Chart */}
          {isFeasible && (
            <GanttChart 
              inputs={inputs}
              advancedSettings={advancedSettings}
              result={calculationResult}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;