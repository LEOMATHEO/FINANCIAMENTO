import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Dashboard from './src/screens/Dashboard';
import Cadastro from './src/screens/Cadastro';
import Historico from './src/screens/Historico';
import Simulacao from './src/screens/Simulacao';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen name="Dashboard" component={Dashboard} />
        <Stack.Screen name="Cadastro" component={Cadastro} />
        <Stack.Screen name="Historico" component={Historico} />
        <Stack.Screen name="Simulacao" component={Simulacao} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
