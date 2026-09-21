import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch, saveToken } from '../lib/api';

export default function LoginPessoal() {
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    (async () => {
      const codigoSalvo = await AsyncStorage.getItem('tenant_join_code');
      if (!codigoSalvo) {
        // Sem grupo selecionado ainda, volta pro início
        router.replace('/');
        return;
      }
      setJoinCode(codigoSalvo);
    })();
  }, []);

  const handleLogin = async () => {
    if (!joinCode) return;

    if (accessCode.trim().length !== 6) {
      Alert.alert('Atenção', 'Digite os 6 dígitos do seu código pessoal.');
      return;
    }

    setCarregando(true);
    try {
      const resultado = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({
          tenant_join_code: joinCode,
          access_code: accessCode.trim(),
        }),
      });

      await saveToken(resultado.access_token);
      router.replace('/mapa');
    } catch (erro) {
      Alert.alert('Código inválido', 'Confira o código com o organizador do grupo.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.titulo}>Seu código pessoal</Text>
        <Text style={styles.subtitulo}>
          Digite o código de 6 dígitos que está no seu crachá
        </Text>

        <TextInput
          style={styles.input}
          placeholder="000000"
          value={accessCode}
          onChangeText={setAccessCode}
          keyboardType="number-pad"
          maxLength={6}
        />

        <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={carregando}>
          <Text style={styles.textoBotao}>{carregando ? 'Entrando...' : 'Entrar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={() => router.push({ pathname: '/scanner', params: { modo: 'pessoal' } })}
          disabled={carregando}
        >
          <Text style={styles.textoBotaoSecundario}>Escanear QR code do crachá</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/')} disabled={carregando}>
          <Text style={styles.trocarGrupo}>Trocar de grupo</Text>
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
    fontSize: 28,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 16,
  },
  botao: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  textoBotaoSecundario: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
  trocarGrupo: { color: '#007AFF', fontSize: 14, textAlign: 'center' },
});