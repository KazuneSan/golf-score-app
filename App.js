// App.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CourseSelectScreen from './src/screens/CourseSelectScreen';
import RoundSetupScreen from './src/screens/RoundSetupScreen';
import RoundScreen from './src/screens/RoundScreen';
import RoundResultScreen from './src/screens/RoundResultScreen';
import RoundCompleteScreen from './src/screens/RoundCompleteScreen';
import ChallengePickerScreen from './src/screens/ChallengePickerScreen';
import DrillListScreen from './src/screens/DrillListScreen';
import DrillDetailScreen from './src/screens/DrillDetailScreen';
import DrillTestScreen from './src/screens/DrillTestScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { THEMES, FONT } from './src/theme/tokens';
import { hasCompletedOnboarding } from './src/data/persona';

const theme = THEMES.light;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarIcon: () => null,
        tabBarStyle: {
          backgroundColor: theme.bg,
          borderTopColor: theme.border,
          borderTopWidth: 0.5,
        },
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textTer,
        tabBarLabelStyle: {
          fontFamily: FONT.mono,
          fontSize: 11,
          letterSpacing: 0.8,
          fontWeight: '500',
        },
        tabBarLabelPosition: 'beside-icon',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'HOME' }} />
      <Tab.Screen name="Practice" component={PracticeScreen} options={{ tabBarLabel: 'PRACTICE' }} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ tabBarLabel: 'ANALYTICS' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    hasCompletedOnboarding().then(done => {
      setNeedsOnboarding(!done);
      setReady(true);
    }).catch(() => {
      setNeedsOnboarding(false);
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName={needsOnboarding ? 'Onboarding' : 'Main'}
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTitleStyle: { color: theme.text, fontSize: 15, fontWeight: '600' },
            headerTintColor: theme.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.bg },
          }}
        >
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '設定', presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="CourseSelect" component={CourseSelectScreen} options={{ title: 'コースを選ぶ' }} />
          <Stack.Screen name="RoundSetup" component={RoundSetupScreen} options={{ title: 'ラウンド設定' }} />
          <Stack.Screen name="ChallengePicker" component={ChallengePickerScreen} options={{ title: '課題を選ぶ' }} />
          <Stack.Screen name="Round" component={RoundScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RoundResult" component={RoundResultScreen} options={{ title: 'ラウンド結果' }} />
          <Stack.Screen name="RoundComplete" component={RoundCompleteScreen} options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="DrillList" component={DrillListScreen} options={{ title: 'ドリル一覧' }} />
          <Stack.Screen name="DrillDetail" component={DrillDetailScreen} options={{ title: 'ドリル解説' }} />
          <Stack.Screen name="DrillTest" component={DrillTestScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
