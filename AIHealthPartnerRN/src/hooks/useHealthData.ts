// useHealthData.ts
// Pure mock version for Expo Go compatibility — simulates Apple Watch data.
import { useState, useEffect, useRef, useCallback } from 'react';
import { getMockVitals, generateHeartRateHistory } from '../services/MockDataService';

export type DataSource = 'mock';

export interface HealthData {
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  heartRateHistory: number[];
  heartRateVariability: number;
  restingHeartRate: number;
  stepCount: number;
  isAnomalous: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  dataSource: DataSource;
}

export const useHealthData = () => {
  const [data, setData] = useState<HealthData>({
    heartRate: 0,
    respiratoryRate: 0,
    oxygenSaturation: 0,
    heartRateHistory: generateHeartRateHistory(20),
    heartRateVariability: 0,
    restingHeartRate: 0,
    stepCount: 0,
    isAnomalous: false,
    isLoading: true,
    lastUpdated: null,
    dataSource: 'mock',
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkAnomaly = (hr: number, rr: number): boolean => {
    // Simulated anomaly logic: e.g., very high HR
    return hr > 100 || hr < 45 || rr > 20 || rr < 10;
  };

  const updateData = useCallback(() => {
    const vitals = getMockVitals();

    // Generate some extra mock stats
    const mockHRV = Math.round(40 + Math.random() * 30);
    const mockResting = Math.round(58 + Math.random() * 8);
    const mockSteps = Math.round(4500 + Math.random() * 1000);

    setData(prev => ({
      ...prev,
      heartRate: vitals.heartRate,
      respiratoryRate: vitals.respiratoryRate,
      oxygenSaturation: vitals.oxygenSaturation,
      heartRateHistory: [...prev.heartRateHistory.slice(1), vitals.heartRate],
      heartRateVariability: mockHRV,
      restingHeartRate: mockResting,
      stepCount: mockSteps,
      isAnomalous: checkAnomaly(vitals.heartRate, vitals.respiratoryRate),
      isLoading: false,
      lastUpdated: new Date(),
      dataSource: 'mock',
    }));
  }, []);

  useEffect(() => {
    // Initial fetch
    updateData();

    // Poll every 5 seconds for simulated "live" updates
    intervalRef.current = setInterval(updateData, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateData]);

  return data;
};
