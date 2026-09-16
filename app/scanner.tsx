import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

export default function Scanner() {
  const [permissao, solicitarPermissao] = useCameraPermissions();
  const [processando, setProcessando] = useState(false);

  const handleLido = async ({ data }: { data: string }) => {
    // Trava novas leituras enquanto processa a primeira, evita chamadas duplicadas
    if (processando) return;
    setProcessando(true);

    const codigo = data.trim().toUpperCase();

    try {
      const resultado = await apiFetch(`/tenant/${codigo}/exists`);

      if (!resultado.exists) {
        Alert.alert('QR code inválido', 'Esse código não corresponde a nenhum grupo.', [
          { text: 'Tentar de novo', onPress: () => setProcessando(false) },
        ]);
        return;
      }

      await AsyncStorage.setItem('tenant_join_code', codigo);
      router.replace('/login');
    } catch (erro) {
      Alert.alert('Erro', 'Não foi possível verificar o grupo.', [
        { text: 'Tentar de novo', onPress: () => setProcessando(false) },
      ]);
    }
  };

  if (!permissao) {
    return <View style={styles.container} />;
  }

  if (!permissao.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.texto}>Precisamos da câmera para ler o QR code do grupo.</Text>
        <TouchableOpacity style={styles.botao} onPress={solicitarPermissao}>
          <Text style={styles.textoBotao}>Permitir câmera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={processando ? undefined : handleLido}
        />
        <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
          <View style={styles.moldura} />
          <Text style={styles.dica}>Aponte a câmera para o QR code do crachá</Text>
          <TouchableOpacity style={styles.botaoVoltar} onPress={() => router.back()}>
            <Text style={styles.textoBotaoVoltar}>Digitar código manualmente</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', padding: 24 },
  texto: { color: '#333', fontSize: 16, textAlign: 'center', marginBottom: 16 },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  moldura: {
    width: 220,
    height: 220,
    marginTop: 100,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 16,
  },
  dica: { color: '#fff', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  botao: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
  botaoVoltar: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  textoBotaoVoltar: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
