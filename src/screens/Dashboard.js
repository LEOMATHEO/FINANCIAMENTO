import React from 'react';
import { View, Text, Button } from 'react-native';

export default function Dashboard({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Saldo devedor: R$ 251.346,73</Text>
      <Text>Prazo recalculado: 50 meses</Text>
      <Text>Amortização extra necessária: R$ 5.027,00/mês</Text>
      <Button title="Registrar pagamento/amortização extra" onPress={() => {}} />
    </View>
  );
}
