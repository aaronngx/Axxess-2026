// MockDataService.ts
// Provides realistic mock data for development and simulator testing

export interface VitalsReading {
  heartRate: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  timestamp: Date;
}

export interface MoodEntry {
  id: string;
  mood: number; // 1-5
  note: string;
  timestamp: Date;
}

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface RecoveryTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'exercise' | 'nutrition' | 'mental' | 'sleep';
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

// Generate a realistic heart rate stream
export const generateHeartRateHistory = (points = 20): number[] => {
  const base = 68;
  return Array.from({ length: points }, (_, i) =>
    Math.round(base + Math.sin(i * 0.5) * 8 + (Math.random() - 0.5) * 6)
  );
};

export const getMockVitals = (): VitalsReading => ({
  heartRate: Math.round(62 + Math.random() * 20),
  respiratoryRate: Math.round(14 + Math.random() * 4),
  oxygenSaturation: Math.round(97 + Math.random() * 2),
  timestamp: new Date(),
});

export const getMockMoodHistory = (): MoodEntry[] => [
  { id: '1', mood: 4, note: 'Feeling energized after morning walk', timestamp: new Date(Date.now() - 86400000 * 2) },
  { id: '2', mood: 3, note: 'Bit tired, long meeting day', timestamp: new Date(Date.now() - 86400000) },
  { id: '3', mood: 5, note: 'Great sleep, ready for the day!', timestamp: new Date() },
];

export const getMockChatHistory = (): ChatMessage[] => [
  {
    id: '1',
    text: "Hi! I'm your AI Health Partner. How are you feeling today?",
    isUser: false,
    timestamp: new Date(Date.now() - 60000 * 5),
  },
  {
    id: '2',
    text: "I'm a bit stressed with work lately.",
    isUser: true,
    timestamp: new Date(Date.now() - 60000 * 4),
  },
  {
    id: '3',
    text: "I understand. I noticed your resting heart rate has been slightly elevated this week — that can be a sign of stress. Have you tried a 5-minute breathing exercise today?",
    isUser: false,
    timestamp: new Date(Date.now() - 60000 * 3),
  },
];

export const getMockAIResponse = (input: string): string => {
  const responses = [
    "Based on your vitals today, your body is handling stress reasonably well. I'd recommend a short walk to help lower cortisol.",
    "Your heart rate variability looks good! That's a positive sign for recovery. Keep up the hydration.",
    "I notice you've been logging lower mood scores this week. Would you like to try a 2-minute mindfulness exercise?",
    "Great job completing your recovery tasks today! Your consistency is building real resilience.",
    "Your respiratory rate is within a healthy range. Deep breathing exercises can help if you're feeling anxious.",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};

export const getMockRecoveryTasks = (): RecoveryTask[] => [
  { id: '1', title: '10-min Morning Walk', description: 'Light activity to get circulation going', completed: true, category: 'exercise' },
  { id: '2', title: 'Hydrate (8 glasses)', description: 'Track your water intake throughout the day', completed: false, category: 'nutrition' },
  { id: '3', title: '5-min Breathing Exercise', description: 'Box breathing: 4 counts in, hold, out, hold', completed: false, category: 'mental' },
  { id: '4', title: 'Sleep by 10:30 PM', description: 'Consistent sleep schedule aids recovery', completed: false, category: 'sleep' },
  { id: '5', title: 'Eat a balanced lunch', description: 'Focus on protein and vegetables for energy', completed: true, category: 'nutrition' },
];

export const getMockEmergencyContacts = (): EmergencyContact[] => [
  { id: '1', name: 'Sarah Johnson', relationship: 'Spouse', phone: '+1 (555) 234-5678' },
  { id: '2', name: 'Dr. Michael Chen', relationship: 'Primary Physician', phone: '+1 (555) 987-6543' },
  { id: '3', name: 'Mom', relationship: 'Family', phone: '+1 (555) 111-2222' },
];
