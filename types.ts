export interface CalculatorInputs {
  material: number; // tonnes
  distance: number; // miles
  time: number; // hours
  loadTime: number; // minutes
  startTime: string; // "HH:MM" format
  pricePerTonne: number; // currency
  costPerLorry: number; // currency
}

export interface AdvancedSettings {
  lorryCapacity: number; // tonnes
  avgSpeed: number; // mph
  tipTime: number; // minutes
}

export interface CalculationResult {
  lorriesNeeded: number;
  totalTripsNeeded: number;
  timePerTrip: number; // hours
  tripsPerLorry: number;
  totalValue: number;
  totalCost: number;
  achievableMaterial?: number;
  achievableValue?: number;
  requiredTime?: number;
}