import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMockRecoveryTasks, getMockEmergencyContacts, RecoveryTask, EmergencyContact } from '../services/MockDataService';

// --- Types ---

export interface MoodEntry {
    id: string;
    emoji: string;
    note: string;
    timestamp: string;
}

export interface SymptomEntry {
    id: string;
    text: string;
    timestamp: string;
}

export interface AppointmentData {
    date: string;
    reminderEnabled: boolean;
}

interface AppContextType {
    moodHistory: MoodEntry[];
    symptomLog: SymptomEntry[];
    appointment: AppointmentData;
    recoveryTasks: RecoveryTask[];
    emergencyContacts: EmergencyContact[];
    addMood: (mood: Omit<MoodEntry, 'id' | 'timestamp'>) => Promise<void>;
    addSymptom: (text: string) => Promise<void>;
    removeSymptom: (id: string) => Promise<void>;
    updateAppointment: (date: Date, reminderEnabled: boolean) => Promise<void>;
    toggleRecoveryTask: (id: string) => Promise<void>;
    addRecoveryTask: (task: Omit<RecoveryTask, 'id' | 'completed'>) => Promise<void>;
    removeRecoveryTask: (id: string) => Promise<void>;
    addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
    updateEmergencyContact: (contact: EmergencyContact) => Promise<void>;
    deleteEmergencyContact: (id: string) => Promise<void>;
    isLoading: boolean;
}

// --- Context & Provider ---

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([]);
    const [symptomLog, setSymptomLog] = useState<SymptomEntry[]>([]);
    const [appointment, setAppointment] = useState<AppointmentData>({
        date: new Date().toISOString(),
        reminderEnabled: false,
    });
    const [recoveryTasks, setRecoveryTasks] = useState<RecoveryTask[]>(getMockRecoveryTasks());
    const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>(getMockEmergencyContacts());
    const [isLoading, setIsLoading] = useState(true);

    const STORAGE_KEY = '@ai_health_partner_data_v2'; // Bumped key for schema change

    // Load data on init
    useEffect(() => {
        const loadData = async () => {
            try {
                const savedData = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    if (parsed.moodHistory) setMoodHistory(parsed.moodHistory);
                    if (parsed.symptomLog) setSymptomLog(parsed.symptomLog);
                    if (parsed.appointment) setAppointment(parsed.appointment);
                    if (parsed.recoveryTasks) setRecoveryTasks(parsed.recoveryTasks);
                    if (parsed.emergencyContacts) setEmergencyContacts(parsed.emergencyContacts);
                }
            } catch (e) {
                console.error('Failed to load data', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Save data whenever it changes
    useEffect(() => {
        if (isLoading) return;
        const saveData = async () => {
            try {
                const dataToSave = { moodHistory, symptomLog, appointment, recoveryTasks, emergencyContacts };
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            } catch (e) {
                console.error('Failed to save data', e);
            }
        };
        saveData();
    }, [moodHistory, symptomLog, appointment, recoveryTasks, emergencyContacts, isLoading]);

    // --- Actions ---

    const addMood = async (mood: Omit<MoodEntry, 'id' | 'timestamp'>) => {
        const newEntry: MoodEntry = {
            ...mood,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
        };
        setMoodHistory(prev => [newEntry, ...prev]);
    };

    const addSymptom = async (text: string) => {
        const newEntry: SymptomEntry = {
            id: Date.now().toString(),
            text,
            timestamp: new Date().toISOString(),
        };
        setSymptomLog(prev => [newEntry, ...prev]);
    };

    const removeSymptom = async (id: string) => {
        setSymptomLog(prev => prev.filter(s => s.id !== id));
    };

    const updateAppointment = async (date: Date, reminderEnabled: boolean) => {
        setAppointment({
            date: date.toISOString(),
            reminderEnabled,
        });
    };

    const toggleRecoveryTask = async (id: string) => {
        setRecoveryTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const addRecoveryTask = async (task: Omit<RecoveryTask, 'id' | 'completed'>) => {
        const newTask: RecoveryTask = {
            ...task,
            id: Date.now().toString(),
            completed: false,
        };
        console.log('AppContext: Adding task:', JSON.stringify(newTask));
        setRecoveryTasks(prev => {
            const updated = [...prev, newTask];
            console.log('AppContext: Recovery tasks count after add:', updated.length);
            return updated;
        });
    };

    const removeRecoveryTask = async (id: string) => {
        console.log('AppContext: Removing task ID:', id);
        setRecoveryTasks(prev => {
            const updated = prev.filter(t => t.id !== id);
            console.log('AppContext: Recovery tasks count after remove:', updated.length);
            return updated;
        });
    };

    const addEmergencyContact = async (contact: Omit<EmergencyContact, 'id'>) => {
        const newContact: EmergencyContact = {
            ...contact,
            id: Date.now().toString(),
        };
        setEmergencyContacts(prev => [...prev, newContact]);
    };

    const updateEmergencyContact = async (contact: EmergencyContact) => {
        setEmergencyContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
    };

    const deleteEmergencyContact = async (id: string) => {
        setEmergencyContacts(prev => prev.filter(c => c.id !== id));
    };

    return (
        <AppContext.Provider
            value={{
                moodHistory,
                symptomLog,
                appointment,
                recoveryTasks,
                emergencyContacts,
                addMood,
                addSymptom,
                removeSymptom,
                updateAppointment,
                addRecoveryTask,
                removeRecoveryTask,
                toggleRecoveryTask,
                addEmergencyContact,
                updateEmergencyContact,
                deleteEmergencyContact,
                isLoading,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

// --- Custom Hook ---

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
