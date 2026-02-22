// AppNavigator.tsx — Bottom tab navigation
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { VitalsDashboard } from '../screens/VitalsDashboard';
import { MentalHealthScreen } from '../screens/MentalHealthScreen';
import { RecoveryScreen } from '../screens/RecoveryScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';
import { ClinicalScreen } from '../screens/ClinicalScreen';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'Vitals', component: VitalsDashboard, icon: '❤️', label: 'Vitals', activeColor: '#42CAFD' },
  { name: 'Mental', component: MentalHealthScreen, icon: '🧠', label: 'Mental', activeColor: '#FF758C' },
  { name: 'Recovery', component: RecoveryScreen, icon: '🌿', label: 'Recovery', activeColor: '#128208' },
  { name: 'Clinical', component: ClinicalScreen, icon: '🏥', label: 'Clinical', activeColor: '#42CAFD' },
  { name: 'Emergency', component: EmergencyScreen, icon: '🆘', label: 'SOS', activeColor: '#D33F49' },
];

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
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
    </NavigationContainer>
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
  iconWrapActive: {},
  icon: { fontSize: 22 },
  tabLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 8 },
  tabLabelActive: {},
});
