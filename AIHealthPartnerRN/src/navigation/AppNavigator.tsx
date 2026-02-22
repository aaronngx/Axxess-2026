// AppNavigator.tsx — Root stack + bottom tab navigation
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { BlurView } from 'expo-blur';

// Premium Overhaul Screens
import { VitalsDashboard } from '../screens/VitalsDashboard';
import { MentalHealthScreen } from '../screens/MentalHealthScreen';
import { RecoveryScreen } from '../screens/RecoveryScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';
import { ClinicalScreen } from '../screens/ClinicalScreen';

// Eye feature screens (Preserved)
import { EyeSafetyGate } from '../features/eye/screens/EyeSafetyGate';
import { EyeSetupCamera } from '../features/eye/screens/EyeSetupCamera';
import { EyePdLock } from '../features/eye/screens/EyePdLock';
import { EyeFarTest } from '../features/eye/screens/EyeFarTest';
import { EyeAstigDial } from '../features/eye/screens/EyeAstigDial';
import { EyeNear } from '../features/eye/screens/EyeNear';
import { EyeContrast } from '../features/eye/screens/EyeContrast';
import { EyeLowLight } from '../features/eye/screens/EyeLowLight';
import { EyeResults } from '../features/eye/screens/EyeResults';
import { EyeHistory } from '../features/eye/screens/EyeHistory';
import { EyeSessionProvider } from '../features/eye/EyeSessionContext';
import { RootStackParamList } from '../features/eye/models/types';

// Hearing Screening screens (Preserved)
import { HearingEntry } from '../features/hearing/screens/HearingEntry';
import { HearingPreCheck } from '../features/hearing/screens/HearingPreCheck';
import { HearingAppleInput } from '../features/hearing/screens/HearingAppleInput';
import { HearingSpeechInNoise } from '../features/hearing/screens/HearingSpeechInNoise';
import { HearingResults } from '../features/hearing/screens/HearingResults';
import { HearingHistory } from '../features/hearing/screens/HearingHistory';
import { HearingSessionProvider } from '../features/hearing/HearingSessionContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

const TAB_CONFIG = [
  { name: 'Vitals', component: VitalsDashboard, icon: '❤️', label: 'Vitals', activeColor: '#42CAFD' },
  { name: 'Mental', component: MentalHealthScreen, icon: '🧠', label: 'Mental', activeColor: '#FF758C' },
  { name: 'Recovery', component: RecoveryScreen, icon: '🌿', label: 'Recovery', activeColor: '#128208' },
  { name: 'Clinical', component: ClinicalScreen, icon: '🏥', label: 'Clinical', activeColor: '#42CAFD' },
  { name: 'Emergency', component: EmergencyScreen, icon: '🆘', label: 'SOS', activeColor: '#D33F49' },
];

const TabsNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarBackground: () => (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ),
      tabBarLabel: ({ focused }) => {
        const cfg = TAB_CONFIG.find(t => t.name === route.name)!;
        return (
          <Text style={[styles.tabLabel, focused && { color: cfg.activeColor }]}>
            {cfg.label}
          </Text>
        );
      },
      tabBarIcon: ({ focused }) => {
        const cfg = TAB_CONFIG.find(t => t.name === route.name)!;
        return (
          <View style={[styles.iconWrap, focused && { backgroundColor: `${cfg.activeColor}4D` }]}>
            <Text style={styles.icon}>{cfg.icon}</Text>
          </View>
        );
      },
    })}
  >
    {TAB_CONFIG.map(tab => (
      <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
    ))}
  </Tab.Navigator>
);

export const AppNavigator: React.FC = () => {
  return (
    <EyeSessionProvider>
      <HearingSessionProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#161925' } }}>
            {/* Main app tabs */}
            <Stack.Screen name="Tabs" component={TabsNavigator} />

            {/* Eye Vision Screening flow (Preserved) */}
            <Stack.Screen name="EyeSafetyGate" component={EyeSafetyGate} />
            <Stack.Screen name="EyeSetupCamera" component={EyeSetupCamera} />
            <Stack.Screen name="EyePdLock" component={EyePdLock} />
            <Stack.Screen name="EyeFarTest" component={EyeFarTest} />
            <Stack.Screen name="EyeAstigDial" component={EyeAstigDial} />
            <Stack.Screen name="EyeNear" component={EyeNear} />
            <Stack.Screen name="EyeContrast" component={EyeContrast} />
            <Stack.Screen name="EyeLowLight" component={EyeLowLight} />
            <Stack.Screen name="EyeResults" component={EyeResults} />
            <Stack.Screen name="EyeHistory" component={EyeHistory} />

            {/* Hearing Screening flow (Preserved) */}
            <Stack.Screen name="HearingEntry" component={HearingEntry} />
            <Stack.Screen name="HearingPreCheck" component={HearingPreCheck} />
            <Stack.Screen name="HearingAppleInput" component={HearingAppleInput} />
            <Stack.Screen name="HearingSpeechInNoise" component={HearingSpeechInNoise} />
            <Stack.Screen name="HearingResults" component={HearingResults} />
            <Stack.Screen name="HearingHistory" component={HearingHistory} />
          </Stack.Navigator>
        </NavigationContainer>
      </HearingSessionProvider>
    </EyeSessionProvider>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    height: 96,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 8,
  },
  icon: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 8 },
});
