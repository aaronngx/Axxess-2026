// AppNavigator.tsx — Root stack + bottom tab navigation
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { BlurView } from 'expo-blur';
import { VitalsDashboard } from '../screens/VitalsDashboard';
import { MentalHealthScreen } from '../screens/MentalHealthScreen';
import { RecoveryScreen } from '../screens/RecoveryScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';

// Eye feature screens
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

const TAB_CONFIG = [
  { name: 'Vitals', component: VitalsDashboard, icon: '❤️', label: 'Vitals' },
  { name: 'Mental', component: MentalHealthScreen, icon: '🧠', label: 'Mental' },
  { name: 'Recovery', component: RecoveryScreen, icon: '🌿', label: 'Recovery' },
  { name: 'Emergency', component: EmergencyScreen, icon: '🆘', label: 'SOS' },
];

// Bottom tabs — unchanged from original
const TabsNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: tabStyles.tabBar,
      tabBarBackground: () => (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ),
      tabBarLabel: ({ focused }) => {
        const cfg = TAB_CONFIG.find(t => t.name === route.name)!;
        return (
          <Text style={[tabStyles.tabLabel, focused && tabStyles.tabLabelActive]}>
            {cfg.label}
          </Text>
        );
      },
      tabBarIcon: ({ focused }) => {
        const cfg = TAB_CONFIG.find(t => t.name === route.name)!;
        return (
          <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
            <Text style={tabStyles.icon}>{cfg.icon}</Text>
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
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#0A0A1A' } }}>
          {/* Main app tabs */}
          <Stack.Screen name="Tabs" component={TabsNavigator} />

          {/* Eye Vision Screening flow (Phases 1–13) */}
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
        </Stack.Navigator>
      </NavigationContainer>
    </EyeSessionProvider>
  );
};

const tabStyles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    height: 88,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 6,
  },
  iconWrapActive: {
    backgroundColor: 'rgba(108,92,231,0.3)',
  },
  icon: { fontSize: 22 },
  tabLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginBottom: 8 },
  tabLabelActive: { color: '#A29BFE' },
});
