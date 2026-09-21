import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Stack, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

type Membro = {
  id: number;
  nome: string | null;
  sobrenome: string | null;
  is_admin: boolean;
};

function nomeExibicao(m: Membro): string {
  const partes = [m.nome, m.sobrenome].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Peregrino sem nome cadastrado';
}

export default function Membros() {
  const [carregando, setCarregando] = useState(true);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [codigoResetado, setCodigoResetado] = useState<{ nome: string; codigo: string } | null>(
    null
  );

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await apiFetch('/users');
      setMembros(dados);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os membros do grupo.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Recarrega toda vez que a tela ganha foco (ex: voltando de outra tela)
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const resetarCodigo = async (membro: Membro) => {
    try {
      const resultado = await apiFetch(`/user/${membro.id}/reset-code`, { method: 'POST' });
      setCodigoResetado({ nome: nomeExibicao(membro), codigo: resultado.access_code });
    } catch {
      Alert.alert('Erro', 'Não foi possível resetar o código.');
    }
  };

  const promoverAdmin = async (membro: Membro) => {
    try {
      await apiFetch(`/user/${membro.id}/promote`, { method: 'POST' });
      Alert.alert('Pronto', `${nomeExibicao(membro)} agora é admin.`);
      carregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível promover esse usuário.');
    }
  };

  const rebaixarAdmin = async (membro: Membro) => {
    try {
      await apiFetch(`/user/${membro.id}/demote`, { method: 'POST' });
      Alert.alert('Pronto', `${nomeExibicao(membro)} não é mais admin.`);
      carregar();
    } catch (erro: any) {
      Alert.alert('Erro', erro.message || 'Não foi possível rebaixar esse usuário.');
    }
  };

  const abrirOpcoes = (membro: Membro) => {
    const opcoes: any[] = [
      {
        text: 'Resetar código de acesso',
        onPress: () =>
          Alert.alert(
            'Resetar código?',
            `O código atual de ${nomeExibicao(membro)} deixará de funcionar imediatamente.`,
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Resetar', style: 'destructive', onPress: () => resetarCodigo(membro) },
            ]
          ),
      },
    ];
    if (!membro.is_admin) {
      opcoes.push({ text: 'Promover a admin', onPress: () => promoverAdmin(membro) });
    } else {
      opcoes.push({
        text: 'Rebaixar para peregrino',
        style: 'destructive',
        onPress: () => rebaixarAdmin(membro),
      });
    }
    opcoes.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert(nomeExibicao(membro), undefined, opcoes);
  };

  // Tela de resultado do reset — mostra o novo QR code
  if (codigoResetado) {
    return (
      <>
        <Stack.Screen options={{ title: 'Novo código gerado' }} />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollSucesso}>
            <Text style={styles.tituloSucesso}>{codigoResetado.nome}</Text>
            <Text style={styles.avisoSucesso}>
              Novo código de acesso gerado. O anterior não funciona mais. Anote ou
              imprima agora — ele não aparece de novo.
            </Text>

            <View style={styles.qrWrapper}>
              <QRCode value={codigoResetado.codigo} size={220} />
            </View>

            <Text style={styles.codigoTexto}>{codigoResetado.codigo}</Text>

            <TouchableOpacity
              style={styles.botao}
              onPress={() => setCodigoResetado(null)}
            >
              <Text style={styles.textoBotao}>Voltar aos membros</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Membros do grupo' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
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
              <TouchableOpacity style={styles.itemMembro} onPress={() => abrirOpcoes(item)}>
                <Text style={styles.nomeMembro}>{nomeExibicao(item)}</Text>
                {item.is_admin && (
                  <View style={styles.badgeAdmin}>
                    <Text style={styles.textoBadgeAdmin}>Admin</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          />
        )}

        <TouchableOpacity
          style={styles.botaoCadastrar}
          onPress={() => router.push('/cadastrar-usuario')}
        >
          <Text style={styles.textoBotao}>+ Cadastrar novo peregrino</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerCarregando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: 16 },
  semMembros: { textAlign: 'center', color: '#999', marginTop: 40 },
  itemMembro: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nomeMembro: { fontSize: 16 },
  badgeAdmin: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  textoBadgeAdmin: { color: '#fff', fontSize: 12, fontWeight: '700' },
  botaoCadastrar: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    margin: 16,
  },
  botao: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scrollSucesso: { padding: 20, alignItems: 'center' },
  tituloSucesso: { fontSize: 22, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  avisoSucesso: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24 },
  qrWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 16,
  },
  codigoTexto: { fontSize: 28, fontWeight: '800', letterSpacing: 6, marginBottom: 24 },
});