import React, { useMemo } from 'react';
import { CalculatorInputs, CalculationResult, AdvancedSettings } from '../types';
import { ChartBarIcon } from './Icons';

interface GanttChartProps {
  inputs: CalculatorInputs;
  result: CalculationResult;
  advancedSettings: AdvancedSettings;
}

interface TripPhase {
  start: number; // in hours from 0
  end: number;   // in hours from 0
  type: 'loading' | 'travel' | 'tipping';
}

interface LorrySchedule {
  id: number;
  trips: TripPhase[][]; // An array of trips, where each trip is an array of phases
}

// Helper to format hours into HH:MM
const formatTime = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};


const GanttChart: React.FC<GanttChartProps> = ({ inputs, result, advancedSettings }) => {
  const { startTime } = inputs;

  const startOffsetHours = useMemo(() => {
    if (!startTime) return 8; // Default to 8:00 if not provided
    const [h, m] = startTime.split(':').map(Number);
    return (h || 0) + ((m || 0) / 60);
  }, [startTime]);
  
  const { schedules, maxTime } = useMemo<{ schedules: LorrySchedule[], maxTime: number }>(() => {
    const { lorriesNeeded, totalTripsNeeded } = result;
    if (!isFinite(lorriesNeeded) || lorriesNeeded <= 0) {
      return { schedules: [], maxTime: inputs.time };
    }
    
    const { loadTime, distance } = inputs;
    const { avgSpeed, tipTime } = advancedSettings;

    const loadTimeHours = loadTime / 60;
    const travelTimeHours = distance / avgSpeed;
    const tipTimeHours = tipTime / 60;

    const simulationStartTime = 0;

    const lorries: { id: number; trips: TripPhase[][]; nextAvailableTime: number }[] = Array.from({ length: lorriesNeeded }, (_, i) => ({
      id: i + 1,
      trips: [],
      nextAvailableTime: simulationStartTime,
    }));

    let loadingBayFreeAt = simulationStartTime;

    for (let i = 0; i < totalTripsNeeded; i++) {
        const earliestLorryTime = Math.min(...lorries.map(l => l.nextAvailableTime));
        const earliestLorryIdx = lorries.findIndex(l => l.nextAvailableTime === earliestLorryTime);
        const nextAvailableLorry = lorries[earliestLorryIdx];

        const tripStartTime = Math.max(nextAvailableLorry.nextAvailableTime, loadingBayFreeAt);
      
        const loadEnd = tripStartTime + loadTimeHours;
        const travelToTipEnd = loadEnd + travelTimeHours;
        const tipEnd = travelToTipEnd + tipTimeHours;
        const tripEndTime = tipEnd + travelTimeHours;

        const tripPhases: TripPhase[] = [
            { start: tripStartTime, end: loadEnd, type: 'loading' },
            { start: loadEnd, end: travelToTipEnd, type: 'travel' },
            { start: travelToTipEnd, end: tipEnd, type: 'tipping' },
            { start: tipEnd, end: tripEndTime, type: 'travel' }, // Add return trip
        ];
        nextAvailableLorry.trips.push(tripPhases);
        nextAvailableLorry.nextAvailableTime = tripEndTime;
        loadingBayFreeAt = loadEnd;
    }
    
    // Post-process schedules: remove the final return trip for each lorry
    lorries.forEach(lorry => {
      if (lorry.trips.length > 0) {
        const lastTrip = lorry.trips[lorry.trips.length - 1];
        if (lastTrip.length > 0 && lastTrip[lastTrip.length - 1].type === 'travel') {
          lastTrip.pop();
        }
      }
    });
    
    // Calculate the actual maximum time the chart needs to display
    let calculatedMaxTime = inputs.time;
    lorries.forEach(lorry => {
        lorry.trips.forEach(trip => {
            trip.forEach(phase => {
                if(phase.end > calculatedMaxTime) {
                    calculatedMaxTime = phase.end;
                }
            })
        })
    });
    
    const finalSchedules = lorries
        .map(({id, trips}) => ({id, trips}))
        .sort((a, b) => a.id - b.id);

    return { schedules: finalSchedules, maxTime: Math.ceil(calculatedMaxTime) };
  }, [inputs, result, advancedSettings]);

  const timeMarkers = Array.from({ length: maxTime + 1 }, (_, i) => i);

  if (schedules.length === 0) {
    return null;
  }
  
  const phaseStyles = {
    loading: { color: 'bg-yellow-500/70 border-yellow-300 hover:bg-yellow-400', label: 'Loading' },
    travel: { color: 'bg-blue-500/70 border-blue-300 hover:bg-blue-400', label: 'Travel' },
    tipping: { color: 'bg-red-500/70 border-red-300 hover:bg-red-400', label: 'Tipping' },
  };

  return (
    <div className="bg-gray-800/50 rounded-xl shadow-2xl p-6 border border-gray-700 animate-fade-in gantt-chart-wrapper">
      <h2 className="text-2xl font-semibold mb-2 text-teal-300 flex items-center gap-3">
        <ChartBarIcon className="w-6 h-6" />
        Lorry Schedule Visualization
      </h2>
      
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-sm">
        {Object.entries(phaseStyles).map(([type, {color, label}]) => (
          <div key={type} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm ${color.split(' ')[0]}`}></span>
            <span className="text-gray-400">{label}</span>
          </div>
        ))}
         <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 border-l-2 border-dashed border-red-500"></div>
            <span className="text-gray-400">Loading Deadline</span>
          </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: '600px' }}>
          <div className="space-y-3">
            {/* Time Axis Row */}
            <div className="flex items-end gap-4 h-10">
              <div className="w-24 shrink-0" /> {/* Spacer to align with lorry labels */}
              <div className="flex-1 relative border-b-2 border-gray-700 h-6">
                {timeMarkers.map(hour => {
                  const timeString = formatTime(startOffsetHours + hour);
                  return (
                    <div
                      key={hour}
                      className="absolute bottom-0 -translate-x-1/2 text-center"
                      style={{ left: `${(hour / maxTime) * 100}%` }}
                    >
                      <span className="text-xs text-gray-400">{timeString}</span>
                      <div className="h-2 border-l border-gray-600 mx-auto mt-1"></div>
                    </div>
                  );
                })}
                {/* Deadline Marker */}
                <div 
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500 z-10"
                  style={{ left: `${(inputs.time / maxTime) * 100}%` }}
                  title={`Loading Deadline: ${formatTime(startOffsetHours + inputs.time)}`}
                ></div>
              </div>
            </div>

            {/* Lorry Schedule Rows */}
            {schedules.map((lorry) => (
              <div key={lorry.id} className="flex items-center gap-4">
                <div className="w-24 text-sm font-medium text-gray-300 text-right shrink-0">Lorry {lorry.id}</div>
                <div className="flex-1 bg-gray-900/50 h-8 rounded-md relative overflow-hidden">
                  {lorry.trips.map((tripPhases, tripIndex) => (
                    <React.Fragment key={tripIndex}>
                      {tripPhases.map((phase, phaseIndex) => {
                        const left = (phase.start / maxTime) * 100;
                        const width = ((phase.end - phase.start) / maxTime) * 100;
                        const style = phaseStyles[phase.type];
                        const duration = (phase.end - phase.start) * 60;
                        return (
                          <div
                            key={phaseIndex}
                            className={`absolute h-full rounded transition-colors duration-200 border-l-2 gantt-chart-bar ${style.color}`}
                            style={{ left: `${left}%`, width: `${width > 0 ? width : 0}%` }}
                            title={`${style.label} (Trip ${tripIndex + 1}): ${formatTime(phase.start + startOffsetHours)} - ${formatTime(phase.end + startOffsetHours)} (${duration.toFixed(0)} mins)`}
                          />
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttChart;