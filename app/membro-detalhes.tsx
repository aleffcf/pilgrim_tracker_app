import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

type Detalhes = {
  id: number;
  nome: string | null;
  sobrenome: string | null;
  idade: number | null;
  tipo_sanguineo: string | null;
  telefone: string | null;
  contato_emergencia_nome: string | null;
  contato_emergencia_telefone: string | null;
  tipo_usuario: string;
  is_admin: boolean;
  presente: boolean;
};

const RECITULO_TIPO: Record<string, string> = {
  peregrino: 'Peregrino',
  apoio: 'Apoio',
  local: 'Local fixo',
};

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.rotuloCampo}>{rotulo}</Text>
      <Text style={styles.valorCampo}>{valor?.trim() ? valor : '—'}</Text>
    </View>
  );
}

export default function MembroDetalhes() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState(false);
  const [dados, setDados] = useState<Detalhes | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resultado = await apiFetch(`/user/${id}`);
        setDados(resultado);
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
        router.back();
      } finally {
        setCarregando(false);
      }
    })();
  }, [id]);

  const confirmarExclusao = () => {
    if (!dados) return;
    Alert.alert(
      'Excluir usuário?',
      `${[dados.nome, dados.sobrenome].filter(Boolean).join(' ') || 'Este usuário'} será removido permanentemente, incluindo o código de acesso. Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: excluir },
      ]
    );
  };

  const excluir = async () => {
    setExcluindo(true);
    try {
      await apiFetch(`/user/${id}`, { method: 'DELETE' });
      router.back();
    } catch (erro: any) {
      Alert.alert('Erro', erro.message || 'Não foi possível excluir esse usuário.');
    } finally {
      setExcluindo(false);
    }
  };

  if (carregando || !dados) {
    return (
      <SafeAreaView style={styles.containerCarregando}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Dados do membro' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Campo rotulo="Nome" valor={dados.nome} />
          <Campo rotulo="Sobrenome" valor={dados.sobrenome} />
          <Campo rotulo="Tipo" valor={RECITULO_TIPO[dados.tipo_usuario] ?? dados.tipo_usuario} />
          <Campo rotulo="Admin" valor={dados.is_admin ? 'Sim' : 'Não'} />
          <Campo rotulo="Idade" valor={dados.idade != null ? String(dados.idade) : null} />
          <Campo rotulo="Tipo sanguíneo" valor={dados.tipo_sanguineo} />
          <Campo rotulo="Telefone" valor={dados.telefone} />
          <Campo rotulo="Contato de emergência" valor={dados.contato_emergencia_nome} />
          <Campo rotulo="Telefone do contato" valor={dados.contato_emergencia_telefone} />
          <Campo rotulo="Presente na chamada" valor={dados.presente ? 'Sim' : 'Não'} />

          <TouchableOpacity
            style={styles.botaoExcluir}
            onPress={confirmarExclusao}
            disabled={excluindo}
          >
            <Text style={styles.textoBotaoExcluir}>
              {excluindo ? 'Excluindo...' : 'Excluir usuário'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerCarregando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  campo: { marginBottom: 16 },
  rotuloCampo: { fontSize: 12, color: '#888', marginBottom: 2 },
  valorCampo: { fontSize: 16 },
  botaoExcluir: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  textoBotaoExcluir: { color: '#fff', fontSize: 16, fontWeight: '600' },
});