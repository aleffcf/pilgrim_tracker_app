import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

type Membro = {
  id: number;
  nome: string | null;
  sobrenome: string | null;
  presente: boolean;
  tipo_usuario: string;
};

function nomeExibicao(m: Membro): string {
  const partes = [m.nome, m.sobrenome].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Peregrino sem nome cadastrado';
}

export default function Chamada() {
  const [carregando, setCarregando] = useState(true);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [atualizando, setAtualizando] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await apiFetch('/users');
      // A chamada é só de gente de verdade — pontos fixos ("local") não
      // fazem sentido na lista de presença.
      setMembros(dados.filter((m: Membro) => m.tipo_usuario !== 'local'));
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar a lista.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const alternarPresenca = async (membro: Membro, novoValor: boolean) => {
    setAtualizando(membro.id);
    // Atualização otimista — a tela responde na hora, sem esperar a API
    setMembros((atual) =>
      atual.map((m) => (m.id === membro.id ? { ...m, presente: novoValor } : m))
    );
    try {
      await apiFetch(`/user/${membro.id}/presenca`, {
        method: 'POST',
        body: JSON.stringify({ presente: novoValor }),
      });
    } catch {
      // Desfaz a atualização otimista se a API falhar
      setMembros((atual) =>
        atual.map((m) => (m.id === membro.id ? { ...m, presente: !novoValor } : m))
      );
      Alert.alert('Erro', 'Não foi possível salvar. Tente de novo.');
    } finally {
      setAtualizando(null);
    }
  };

  const zerarChamada = () => {
    Alert.alert(
      'Zerar chamada?',
      'Todo mundo volta a aparecer como "não presente". Use isso no início de um novo dia.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Zerar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch('/chamada/resetar', { method: 'POST' });
              carregar();
            } catch {
              Alert.alert('Erro', 'Não foi possível zerar a chamada.');
            }
          },
        },
      ]
    );
  };

  const presentes = membros.filter((m) => m.presente).length;

  return (
    <>
      <Stack.Screen options={{ title: 'Chamada' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.cabecalho}>
          <Text style={styles.contagem}>
            {presentes} de {membros.length} presentes
          </Text>
        </View>

        {carregando ? (
          <View style={styles.containerCarregando}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={membros}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.lista}
            ListEmptyComponent={
              <Text style={styles.semMembros}>Nenhum membro cadastrado ainda.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.itemMembro}>
                <Text style={styles.nomeMembro}>{nomeExibicao(item)}</Text>
                <Switch
                  value={item.presente}
                  onValueChange={(valor) => alternarPresenca(item, valor)}
                  disabled={atualizando === item.id}
                />
              </View>
            )}
          />
        )}

        <TouchableOpacity style={styles.botaoZerar} onPress={zerarChamada}>
          <Text style={styles.textoBotaoZerar}>Zerar chamada</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerCarregando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cabecalho: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  contagem: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  lista: { padding: 16 },
  semMembros: { textAlign: 'center', color: '#999', marginTop: 40 },
  itemMembro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nomeMembro: { fontSize: 16, flex: 1 },
  botaoZerar: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    margin: 16,
  },
  textoBotaoZerar: { color: '#fff', fontSize: 16, fontWeight: '600' },
});