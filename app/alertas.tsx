import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

type SosAlerta = {
  id: number;
  nome: string | null;
  sobrenome: string | null;
  telefone: string | null;
  tipo_sanguineo: string | null;
  sos_acionado_em: string | null;
  latitude: number | null;
  longitude: number | null;
};

function nomeExibicao(a: SosAlerta): string {
  const partes = [a.nome, a.sobrenome].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Peregrino sem nome cadastrado';
}

function formatarHora(iso: string | null): string {
  if (!iso) return '';
  const data = new Date(iso + 'Z'); // backend salva em UTC sem timezone explícito
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Alertas() {
  const [carregando, setCarregando] = useState(true);
  const [alertas, setAlertas] = useState<SosAlerta[]>([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await apiFetch('/sos/ativos');
      setAlertas(dados);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os alertas.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const resolver = (alerta: SosAlerta) => {
    Alert.alert(
      `Marcar como resolvido?`,
      `${nomeExibicao(alerta)} deixará de aparecer nesta lista.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await apiFetch(`/sos/${alerta.id}/resolver`, { method: 'POST' });
              carregar();
            } catch {
              Alert.alert('Erro', 'Não foi possível marcar como resolvido.');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Alertas de SOS' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {carregando ? (
          <View style={styles.containerCarregando}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <FlatList
            data={alertas}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.lista}
            onRefresh={carregar}
            refreshing={carregando}
            ListEmptyComponent={
              <Text style={styles.semAlertas}>Nenhum alerta ativo no momento. 🙌</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.itemAlerta}>
                <View style={styles.infoAlerta}>
                  <Text style={styles.nomeAlerta}>⚠️ {nomeExibicao(item)}</Text>
                  {item.tipo_sanguineo && (
                    <Text style={styles.detalheAlerta}>Tipo sanguíneo: {item.tipo_sanguineo}</Text>
                  )}
                  {item.telefone && (
                    <Text style={styles.detalheAlerta}>Telefone: {item.telefone}</Text>
                  )}
                  <Text style={styles.detalheAlerta}>
                    Acionado às {formatarHora(item.sos_acionado_em)}
                  </Text>
                </View>
                <TouchableOpacity style={styles.botaoResolver} onPress={() => resolver(item)}>
                  <Text style={styles.textoBotaoResolver}>Resolver</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerCarregando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: 16, flexGrow: 1 },
  semAlertas: { textAlign: 'center', color: '#999', marginTop: 60, fontSize: 16 },
  itemAlerta: {
    backgroundColor: '#FFF3F3',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F5C2C2',
  },
  infoAlerta: { marginBottom: 10 },
  nomeAlerta: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  detalheAlerta: { fontSize: 13, color: '#555' },
  botaoResolver: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textoBotaoResolver: { color: '#fff', fontWeight: '700' },
});