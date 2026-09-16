import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

export default function EntradaGrupo() {
  const [codigo, setCodigo] = useState('');
  const [carregando, setCarregando] = useState(false);

  const verificarGrupo = async (codigoDigitado: string) => {
    const codigoNormalizado = codigoDigitado.trim().toUpperCase();

    if (!codigoNormalizado) {
      Alert.alert('Atenção', 'Digite o código do grupo.');
      return;
    }

    setCarregando(true);
    try {
      const resultado = await apiFetch(`/tenant/${codigoNormalizado}/exists`);

      if (!resultado.exists) {
        Alert.alert('Grupo não encontrado', 'Confira o código com o organizador da romaria.');
        return;
      }

      // join_code não é sensível — pode ficar no AsyncStorage normal
      await AsyncStorage.setItem('tenant_join_code', codigoNormalizado);
      router.push('/login');
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível verificar o grupo. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.titulo}>Bem-vindo, romeiro</Text>
        <Text style={styles.subtitulo}>
          Digite o código do seu grupo ou escaneie o QR code no crachá
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: RA2026"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
        />

        <TouchableOpacity
          style={styles.botao}
          onPress={() => verificarGrupo(codigo)}
          disabled={carregando}
        >
          <Text style={styles.textoBotao}>{carregando ? 'Verificando...' : 'Entrar com código'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={() => router.push('/scanner')}
          disabled={carregando}
        >
          <Text style={styles.textoBotaoSecundario}>Escanear QR Code</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitulo: { fontSize: 16, color: '#666', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  botao: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  textoBotaoSecundario: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});
