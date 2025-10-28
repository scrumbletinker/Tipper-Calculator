import React from 'react';
import { CalculationResult, CalculatorInputs } from '../types';
import LorryIcon from './LorryIcon';

interface ResultsCardProps {
  result: CalculationResult;
  inputs: CalculatorInputs;
}

const formatDecimalHours = (decimalHours: number | undefined): string => {
    if (decimalHours === undefined || isNaN(decimalHours) || decimalHours < 0) {
      return 'N/A';
    }
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
  
    const parts: string[] = [];
    if (hours > 0) {
      parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    }
    if (minutes > 0) {
      parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) {
        return '0 minutes';
    }
  
    return parts.join(' ');
};

const ResultsCard: React.FC<ResultsCardProps> = ({ result, inputs }) => {
    const { lorriesNeeded, totalTripsNeeded, timePerTrip, tripsPerLorry, totalValue, totalCost } = result;
    const isFeasible = isFinite(lorriesNeeded) && lorriesNeeded > 0;
    const netPosition = totalValue - totalCost;

  return (
    <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 border border-gray-700">
      <h2 className="text-2xl font-semibold mb-4 text-teal-300">Calculation Results</h2>
      <div className="flex flex-col items-center justify-center bg-gray-900/50 p-6 rounded-lg text-center">
        <p className="text-lg text-gray-400 mb-2">Lorries Required</p>
        <div className="flex items-end gap-3">
          <LorryIcon className={`w-16 h-16 transition-colors duration-300 ${isFeasible ? 'text-teal-400' : 'text-red-500'}`} />
          <span className={`text-7xl font-bold tracking-tighter transition-colors duration-300 ${isFeasible ? 'text-white' : 'text-red-500'}`}>
            {isFeasible ? lorriesNeeded : 'N/A'}
          </span>
        </div>
        {!isFeasible && (
          <>
            <p className="mt-3 text-red-400 font-medium">The operation is not feasible with the current time constraints.</p>
            {result.achievableMaterial > 0 && (
                <div className="mt-4 text-sm text-yellow-300 bg-yellow-900/40 border border-yellow-700/50 rounded-lg p-3 w-full text-left">
                    <p className="font-semibold mb-1">Achievable Target:</p>
                    <p>
                        With the current constraints, you could move approx. <b>{Math.floor(result.achievableMaterial).toLocaleString()} tonnes</b> 
                        (Value: <b>£{Math.floor(result.achievableValue).toLocaleString()}</b>).
                    </p>
                    {result.requiredTime && (
                        <p className="mt-2 pt-2 border-t border-yellow-700/50">
                            To move the full <b>{inputs.material.toLocaleString()} tonnes</b>, consider increasing the planing window to approx. <b>{formatDecimalHours(result.requiredTime)}</b>.
                        </p>
                    )}
                </div>
            )}
          </>
        )}
      </div>
      
      {isFeasible && (
        <>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-700/40 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Total Loads</p>
                    <p className="text-xl font-semibold text-white">{totalTripsNeeded.toLocaleString()}</p>
                </div>
                <div className="bg-gray-700/40 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Turnaround Time</p>
                    <p className="text-xl font-semibold text-white">{formatDecimalHours(timePerTrip)}</p>
                </div>
                <div className="bg-gray-700/40 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Loads per Lorry</p>
                    <p className="text-xl font-semibold text-white">{tripsPerLorry.toFixed(2)}</p>
                </div>
            </div>
            
            <div className="mt-6 border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">Cost & Value</h3>
                <div className="bg-gray-900/50 rounded-lg p-4 space-y-3 text-sm">
                  {/* Row 1: Total Value */}
                  <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Value of Planings</span>
                      <span className="font-semibold text-green-400">£{totalValue.toLocaleString()}</span>
                  </div>
                  {/* Row 2: Total Cost */}
                  <div className="flex justify-between items-center">
                      <span className="text-gray-400">Total Lorry Cost</span>
                      <span className="font-semibold text-red-400">- £{totalCost.toLocaleString()}</span>
                  </div>
                  {/* Separator */}
                  <div className="!my-2 border-t border-gray-700"></div>
                  {/* Row 3: Net Position */}
                  <div className="flex justify-between items-center font-bold text-base">
                      <span className="text-gray-200">Profit / Loss</span>
                      <span className={netPosition >= 0 ? 'text-teal-300' : 'text-orange-400'}>
                          £{netPosition.toLocaleString()}
                      </span>
                  </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default ResultsCard;