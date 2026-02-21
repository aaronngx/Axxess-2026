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

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: 'Vitals', component: VitalsDashboard, icon: '❤️', label: 'Vitals' },
  { name: 'Mental', component: MentalHealthScreen, icon: '🧠', label: 'Mental' },
  { name: 'Recovery', component: RecoveryScreen, icon: '🌿', label: 'Recovery' },
  { name: 'Emergency', component: EmergencyScreen, icon: '🆘', label: 'SOS' },
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
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
                {cfg.label}
              </Text>
            );
          },
          tabBarIcon: ({ focused }) => {
            const cfg = TAB_CONFIG.find(t => t.name === route.name)!;
            return (
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
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
