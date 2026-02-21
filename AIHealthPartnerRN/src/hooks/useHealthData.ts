// useHealthData.ts
// Hook for HealthKit integration — reads real Apple Watch data when available,
// gracefully falls back to mock data on simulator or when HealthKit is unavailable.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { getMockVitals, generateHeartRateHistory, VitalsReading } from '../services/MockDataService';

// ---- HealthKit setup (only loads on native iOS builds) ----
let AppleHealthKit: any = null;
let healthKitAvailable = false;

try {
  if (Platform.OS === 'ios') {
    AppleHealthKit = require('react-native-health').default;
    healthKitAvailable = !!AppleHealthKit;
  }
} catch (e) {
  // Not available (running in Expo Go or simulator without native modules)
  healthKitAvailable = false;
}

// HealthKit permissions — what we want to read from the Watch/iPhone
const HEALTHKIT_PERMISSIONS = {
  permissions: {
    read: [
      'HeartRate',
      'RespiratoryRate',
      'OxygenSaturation',
      'HeartRateVariability',
      'RestingHeartRate',
      'StepCount',
    ],
    write: [],
  },
};

export type DataSource = 'healthkit' | 'mock';

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

// ---- Helper: promisify HealthKit callbacks ----
const getHealthKitData = (method: string, options: any): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!AppleHealthKit || !AppleHealthKit[method]) {
      reject(new Error(`HealthKit method ${method} not available`));
      return;
    }
    AppleHealthKit[method](options, (err: any, results: any[]) => {
      if (err) reject(err);
      else resolve(results || []);
    });
  });
};

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
  const healthKitInitialized = useRef(false);

  const checkAnomaly = (hr: number, rr: number): boolean => {
    return hr > 100 || hr < 45 || rr > 20 || rr < 10;
  };

  // ---- Initialize HealthKit (one-time, requests permissions) ----
  const initHealthKit = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!healthKitAvailable || !AppleHealthKit) {
        resolve(false);
        return;
      }
      AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (err: string) => {
        if (err) {
          console.warn('HealthKit init failed:', err);
          resolve(false);
        } else {
          console.log('✅ HealthKit initialized — reading real Watch data');
          healthKitInitialized.current = true;
          resolve(true);
        }
      });
    });
  }, []);

  // ---- Fetch REAL vitals from HealthKit ----
  const fetchFromHealthKit = async (): Promise<VitalsReading & {
    heartRateVariability: number;
    restingHeartRate: number;
    stepCount: number;
  }> => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const options = {
      startDate: oneDayAgo.toISOString(),
      endDate: now.toISOString(),
      ascending: false,
      limit: 1,
    };

    const historyOptions = {
      startDate: oneDayAgo.toISOString(),
      endDate: now.toISOString(),
      ascending: true,
      limit: 20,
    };

    // Fetch all vitals in parallel
    const [
      heartRateSamples,
      respiratorySamples,
      oxygenSamples,
      hrvSamples,
      restingHRSamples,
    ] = await Promise.all([
      getHealthKitData('getHeartRateSamples', options).catch(() => []),
      getHealthKitData('getRespiratoryRateSamples', options).catch(() => []),
      getHealthKitData('getOxygenSaturationSamples', options).catch(() => []),
      getHealthKitData('getHeartRateVariabilitySamples', options).catch(() => []),
      getHealthKitData('getRestingHeartRate', options).catch(() => []),
    ]);

    // Also fetch step count for today
    let stepCount = 0;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const stepData = await getHealthKitData('getStepCount', {
        startDate: todayStart.toISOString(),
        endDate: now.toISOString(),
      });
      if (stepData && (stepData as any).value) {
        stepCount = Math.round((stepData as any).value);
      }
    } catch { }

    // Extract latest values (most recent sample)
    const heartRate = heartRateSamples.length > 0
      ? Math.round(heartRateSamples[0].value) : 0;
    const respiratoryRate = respiratorySamples.length > 0
      ? Math.round(respiratorySamples[0].value) : 0;
    const oxygenSaturation = oxygenSamples.length > 0
      ? Math.round(oxygenSamples[0].value * 100) : 0;
    const heartRateVariability = hrvSamples.length > 0
      ? Math.round(hrvSamples[0].value) : 0;
    const restingHeartRate = restingHRSamples.length > 0
      ? Math.round(restingHRSamples[0].value) : 0;

    return {
      heartRate,
      respiratoryRate,
      oxygenSaturation,
      heartRateVariability,
      restingHeartRate,
      stepCount,
      timestamp: now,
    };
  };

  // ---- Fetch heart rate history (last 20 readings) for the chart ----
  const fetchHeartRateHistory = async (): Promise<number[]> => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const samples = await getHealthKitData('getHeartRateSamples', {
        startDate: oneDayAgo.toISOString(),
        endDate: now.toISOString(),
        ascending: true,
        limit: 20,
      });
      if (samples.length >= 5) {
        return samples.map((s: any) => Math.round(s.value));
      }
    } catch { }
    return []; // empty = keep existing history
  };

  // ---- Main update loop ----
  const updateData = useCallback(async () => {
    // Try real HealthKit first
    if (healthKitInitialized.current) {
      try {
        const vitals = await fetchFromHealthKit();

        // Only use HealthKit data if we got a real heart rate reading
        if (vitals.heartRate > 0) {
          const history = await fetchHeartRateHistory();

          setData(prev => ({
            ...prev,
            heartRate: vitals.heartRate,
            respiratoryRate: vitals.respiratoryRate > 0 ? vitals.respiratoryRate : prev.respiratoryRate,
            oxygenSaturation: vitals.oxygenSaturation > 0 ? vitals.oxygenSaturation : prev.oxygenSaturation,
            heartRateHistory: history.length >= 5 ? history : [...prev.heartRateHistory.slice(1), vitals.heartRate],
            heartRateVariability: vitals.heartRateVariability,
            restingHeartRate: vitals.restingHeartRate,
            stepCount: vitals.stepCount,
            isAnomalous: checkAnomaly(vitals.heartRate, vitals.respiratoryRate),
            isLoading: false,
            lastUpdated: new Date(),
            dataSource: 'healthkit',
          }));
          return; // success — skip mock
        }
      } catch (err) {
        console.warn('HealthKit read failed, falling back to mock:', err);
      }
    }

    // Fallback: mock data
    const vitals = getMockVitals();
    setData(prev => ({
      ...prev,
      heartRate: vitals.heartRate,
      respiratoryRate: vitals.respiratoryRate,
      oxygenSaturation: vitals.oxygenSaturation,
      heartRateHistory: [...prev.heartRateHistory.slice(1), vitals.heartRate],
      isAnomalous: checkAnomaly(vitals.heartRate, vitals.respiratoryRate),
      isLoading: false,
      lastUpdated: new Date(),
      dataSource: 'mock',
    }));
  }, []);

  // ---- Lifecycle: init HealthKit then start polling ----
  useEffect(() => {
    let mounted = true;

    const start = async () => {
      // Try to init HealthKit (will fail gracefully in Expo Go / simulator)
      await initHealthKit();

      if (mounted) {
        updateData();
        // Poll every 5 seconds for live updates
        intervalRef.current = setInterval(updateData, 5000);
      }
    };

    start();

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [initHealthKit, updateData]);

  return data;
};
