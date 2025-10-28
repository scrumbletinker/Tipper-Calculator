import { GoogleGenAI } from "@google/genai";
import { CalculatorInputs, AdvancedSettings, CalculationResult } from '../types';

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

export const getLogisticsInsights = async (
  inputs: CalculatorInputs,
  advancedSettings: AdvancedSettings,
  result: CalculationResult
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const isFeasible = isFinite(result.lorriesNeeded) && result.lorriesNeeded > 0;

  const financialSummary = isFeasible 
    ? `
    - **Total Value of Material:** £${result.totalValue.toLocaleString()}
    - **Total Lorry Cost:** £${result.totalCost.toLocaleString()}
    - **Net Position:** £${(result.totalValue - result.totalCost).toLocaleString()}
    `
    : `
    - **Total Value (Target):** £${result.totalValue.toLocaleString()}
    - **Achievable Value:** £${result.achievableValue?.toLocaleString() ?? 0}
    - **Net Position:** N/A (Target unachievable)
    `;

  const prompt = `
    As a world-class logistics and transport planning expert, analyze the following scenario and provide actionable advice.
    The response must be in HTML format. Use headings (<h3>), lists (<ul>, <li>), and bold text (<b>) to structure the information clearly. Do not use markdown.

    **Scenario Details:**
    - **Operation Start Time:** ${inputs.startTime}
    - **Total Material to Move:** ${inputs.material} tonnes
    - **Sale Price per Tonne:** £${inputs.pricePerTonne}
    - **Cost per Lorry:** £${inputs.costPerLorry}
    - **One-Way Distance:** ${inputs.distance} miles
    - **Total Time Allowed:** ${formatDecimalHours(inputs.time)}
    - **Operational Constraint:** All loading operations must be completed within the 'Total Time Allowed'. Travel and tipping for the last loads can occur after this deadline.
    - **Lorry Loading Time:** ${inputs.loadTime} minutes per lorry
    - **Assumed Lorry Capacity:** ${advancedSettings.lorryCapacity} tonnes
    - **Assumed Average Speed:** ${advancedSettings.avgSpeed} mph
    - **Assumed Tipping/Unloading Time:** ${advancedSettings.tipTime} minutes per lorry

    **Calculation Summary:**
    - **Feasibility:** ${isFeasible ? 'FEASIBLE' : 'NOT FEASIBLE'}
    ${!isFeasible ? `- **Reason:** The target of ${inputs.material} tonnes cannot be loaded within the ${formatDecimalHours(inputs.time)} deadline.` : ''}
    ${!isFeasible && result.requiredTime ? `- **Required Time:** The simulation shows that approximately **${formatDecimalHours(result.requiredTime)}** are needed to complete loading.` : ''}
    ${!isFeasible && result.achievableMaterial ? `- **Achievable Throughput:** Within the current timeframe, it's possible to move approximately **${result.achievableMaterial.toFixed(0)} tonnes**.` : ''}
    - **Calculated Lorries Needed:** ${isFeasible ? result.lorriesNeeded : 'N/A'}
    - **Total Trips Required:** ${result.totalTripsNeeded}
    - **Calculated Time per Round Trip:** ${result.timePerTrip.toFixed(2)} hours
    - **Average Trips per Lorry:** ${isFeasible ? result.tripsPerLorry.toFixed(2) : 'N/A'}
    ${financialSummary}

    **Your Task:**
    Based on this data, provide a concise analysis covering the following points in separate sections:
    1.  **Feasibility Assessment:** ${isFeasible ? 'Briefly state if the plan is viable, tight, or unfeasible based on the loading constraint.' : `Acknowledge the plan is unfeasible. Discuss the shortfall (target of ${inputs.material} tonnes vs achievable ${result.achievableMaterial?.toFixed(0)} tonnes). Explain that the primary reason is the time constraint (${formatDecimalHours(inputs.time)}), when approximately ${formatDecimalHours(result.requiredTime) ?? 'more time'} is needed.`}
    2.  **Financial Overview:** Comment on the profitability of the operation. ${isFeasible ? 'Is the net position healthy? What are the main financial levers?' : 'Comment on the potential value and why the target is currently unprofitable to pursue with these constraints.'}
    3.  **Key Risks & Bottlenecks:** Identify the top 3-4 potential problems (e.g., traffic, loading delays, driver hour limits, vehicle breakdowns, weather).
    4.  **Optimization Strategies:** Suggest specific, actionable ways to improve the efficiency and profitability of the operation. ${!isFeasible ? 'Focus on strategies that would help achieve the target (e.g., extending hours, reducing load times).' : ''}
    5.  **Other Considerations:** Mention other important factors like regulatory compliance (driver hours), site access, and communication protocols.

    Keep the analysis practical and easy to understand for a site manager.
  `;

  try {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error fetching insights from Gemini:", error);
    if (error instanceof Error && error.message.includes('API key not valid')) {
        throw new Error("The provided API key is invalid. Please check your configuration.");
    }
    throw new Error("Failed to get insights from AI. The service may be temporarily unavailable.");
  }
};