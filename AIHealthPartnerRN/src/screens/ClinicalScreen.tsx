import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    KeyboardAvoidingView, Platform, StatusBar, Alert, Switch
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useAppContext } from '../context/AppContext';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Symptom type is now handled by AppContext

export const ClinicalScreen: React.FC = () => {
    const insets = useSafeAreaInsets();
    const { symptomLog, addSymptom: logSymptom, removeSymptom: deleteSymptom, appointment, updateAppointment } = useAppContext();
    const [showPicker, setShowPicker] = useState(false);
    const [newSymptom, setNewSymptom] = useState('');

    const date = new Date(appointment.date);
    const reminderEnabled = appointment.reminderEnabled;

    useEffect(() => {
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please enable notifications to set appointment reminders.');
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
        }
        if (selectedDate) {
            updateAppointment(selectedDate, reminderEnabled);
        }
    };

    const scheduleReminder = async () => {
        if (!reminderEnabled) return;

        // Schedule 1 hour before the appointment
        const trigger = new Date(date.getTime() - 60 * 60 * 1000);

        if (trigger < new Date()) {
            Alert.alert('Oops!', 'Appointment time is too soon to set a 1-hour reminder.');
            updateAppointment(date, false);
            return;
        }

        try {
            await Notifications.cancelAllScheduledNotificationsAsync();
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Upcoming Doctor's Appointment 🏥",
                    body: `You have an appointment at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                },
                trigger,
            });
            Alert.alert('Reminder Set', 'We will notify you 1 hour before your appointment.');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to schedule reminder.');
        }
    };

    const addSymptom = () => {
        if (!newSymptom.trim()) return;
        logSymptom(newSymptom.trim());
        setNewSymptom('');
    };

    const removeSymptom = (id: string) => {
        deleteSymptom(id);
    };

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#161925', '#235789', '#161925']} style={StyleSheet.absoluteFill} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <Text style={styles.title}>Clinical Care</Text>
                    <Text style={styles.subtitle}>Appointments & Symptom Tracking</Text>

                    {/* Appointment Card */}
                    <LinearGradient colors={['rgba(66, 202, 253, 0.15)', 'rgba(35, 87, 137, 0.1)']} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardIcon}>🗓️</Text>
                            <Text style={styles.cardTitle}>Next Appointment</Text>
                        </View>

                        <TouchableOpacity style={styles.dateSelector} onPress={() => setShowPicker(true)}>
                            <Text style={styles.apptText}>
                                {date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={styles.editLink}>Change</Text>
                        </TouchableOpacity>

                        {showPicker && (
                            <View style={styles.pickerContainer}>
                                {Platform.OS === 'ios' && (
                                    <TouchableOpacity
                                        style={styles.doneBtn}
                                        onPress={() => setShowPicker(false)}
                                    >
                                        <Text style={styles.doneBtnText}>Done</Text>
                                    </TouchableOpacity>
                                )}
                                <DateTimePicker
                                    value={date}
                                    mode="datetime"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                    textColor="#FFFFFF"
                                    themeVariant="dark"
                                />
                            </View>
                        )}

                        <View style={styles.reminderRow}>
                            <View>
                                <Text style={styles.reminderLabel}>Set Phone Reminder</Text>
                                <Text style={styles.reminderSub}>Alert me 1 hour before</Text>
                            </View>
                            <Switch
                                value={reminderEnabled}
                                onValueChange={(val) => {
                                    updateAppointment(date, val);
                                    if (val) scheduleReminder();
                                }}
                                trackColor={{ false: '#3e3e3e', true: '#42CAFD' }}
                                thumbColor={reminderEnabled ? '#FFFFFF' : '#f4f3f4'}
                            />
                        </View>
                    </LinearGradient>

                    {/* Symptom Logger */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Symptom Log</Text>
                        <Text style={styles.sectionSub}>Note down any concerns for your doctor</Text>
                    </View>

                    <View style={styles.symptomInputRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginRight: 10 }]}
                            value={newSymptom}
                            onChangeText={setNewSymptom}
                            placeholder="How are you feeling?"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            multiline
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={addSymptom}>
                            <Text style={styles.addBtnText}>Log</Text>
                        </TouchableOpacity>
                    </View>

                    {symptomLog.map(item => (
                        <View key={item.id} style={styles.symptomItem}>
                            <View style={styles.symptomHeader}>
                                <Text style={styles.symptomDate}>
                                    {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </Text>
                                <TouchableOpacity onPress={() => removeSymptom(item.id)}>
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.symptomText}>{item.text}</Text>
                        </View>
                    ))}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#161925' },
    scroll: { paddingHorizontal: 20 },
    title: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.45)', marginTop: 4, marginBottom: 24 },
    card: {
        borderRadius: 24, padding: 20,
        borderWidth: 1, borderColor: 'rgba(66, 202, 253, 0.2)', marginBottom: 32,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    cardIcon: { fontSize: 24, marginRight: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#42CAFD' },
    dateSelector: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)', padding: 16,
        borderRadius: 16, marginBottom: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
    },
    apptText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', flex: 1 },
    editLink: { color: '#42CAFD', fontWeight: '700', fontSize: 13, marginLeft: 10 },
    reminderRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)'
    },
    reminderLabel: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    reminderSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12, padding: 12, color: '#FFFFFF', fontSize: 15,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    sectionHeader: { marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    sectionSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
    symptomInputRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    addBtn: { backgroundColor: '#42CAFD', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, height: 48, justifyContent: 'center' },
    addBtnText: { color: '#161925', fontWeight: '800' },
    symptomItem: {
        backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)'
    },
    symptomHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    symptomDate: { fontSize: 12, fontWeight: '700', color: '#42CAFD', textTransform: 'uppercase' },
    removeText: { fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
    symptomText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
    pickerContainer: { marginBottom: 20 },
    doneBtn: {
        alignSelf: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        marginBottom: 8
    },
    doneBtnText: { color: '#42CAFD', fontWeight: '700', fontSize: 14 },
});
