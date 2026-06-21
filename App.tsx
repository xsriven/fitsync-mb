import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { setupDatabase } from './src/services/database';

// telas
import LoginScreen from './src/screens/LoginScreen';
import PersonalDashboardScreen from './src/screens/PersonalDashboardScreen';
import AlunoDashboardScreen from './src/screens/AlunoDashboardScreen';
import FichaScreen from './src/screens/FichaScreen';
import ImcScreen from './src/screens/ImcScreen';

export type RootStackParamList = {
  Login: undefined;
  HomePersonal: { tipo: string; usuarioId: string; nome: string };
  HomeAluno: { tipo: string; usuarioId: string; nome: string };
  Ficha: { tipo: string; alunoId?: string; usuarioId?: string };
  IMC: { usuarioId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  
  useEffect(() => {
    // inicia o banco de dados e cria as tabelas
    setupDatabase();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#262626',
          },
          headerTintColor: '#39FF14',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="HomePersonal" 
          component={PersonalDashboardScreen} 
          options={{ title: 'DASHBOARD' }}
        />
        <Stack.Screen 
          name="HomeAluno" 
          component={AlunoDashboardScreen} 
          options={{ title: 'ÁREA DO ALUNO' }}
        />
        <Stack.Screen 
          name="Ficha" 
          component={FichaScreen} 
          options={{ title: 'ROTINA DE TREINOS' }}
        />
        <Stack.Screen 
          name="IMC" 
          component={ImcScreen} 
          options={{ title: 'AVALIAÇÃO FÍSICA' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}