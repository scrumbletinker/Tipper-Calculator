
import React from 'react';

interface InputSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const InputSlider: React.FC<InputSliderProps> = ({ label, value, min, max, step, unit, onChange }) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
        onChange(Math.max(min, Math.min(max, val)));
    }
  };

  const backgroundSize = ((value - min) * 100) / (max - min);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <label className="font-medium text-gray-300">{label}</label>
        <div className="flex items-center space-x-2 bg-gray-900 rounded-md">
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={handleNumberChange}
                className="w-24 bg-transparent text-right font-semibold text-teal-300 focus:outline-none p-1 rounded-md"
            />
            <span className="text-sm text-gray-400 pr-2">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg"
        style={{ background: `linear-gradient(to right, #2dd4bf ${backgroundSize}%, #4b5563 ${backgroundSize}%)`}}
      />
    </div>
  );
};

export default InputSlider;
