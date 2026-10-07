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
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Location from 'expo-location';
import { Stack, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';
import MenuAcoes, { OpcaoMenu } from '../components/MenuAcoes';

type TipoUsuario = 'peregrino' | 'apoio' | 'local';

const RECITULO_TIPO: Record<TipoUsuario, string> = {
  peregrino: 'Peregrino',
  apoio: 'Apoio',
  local: 'Local fixo',
};

type Membro = {
  id: number;
  nome: string | null;
  sobrenome: string | null;
  is_admin: boolean;
  tipo_usuario: TipoUsuario;
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
  const [membroSelecionado, setMembroSelecionado] = useState<Membro | null>(null);
  const [trocandoTipoDe, setTrocandoTipoDe] = useState<Membro | null>(null);
  const [definindoCoordenadasDe, setDefinindoCoordenadasDe] = useState<Membro | null>(null);
  const [latitudeDigitada, setLatitudeDigitada] = useState('');
  const [longitudeDigitada, setLongitudeDigitada] = useState('');

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

  const aplicarNovoTipo = async (membro: Membro, tipo: TipoUsuario) => {
    try {
      await apiFetch(`/user/${membro.id}/tipo`, {
        method: 'PUT',
        body: JSON.stringify({ tipo_usuario: tipo }),
      });
      carregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível trocar o tipo.');
    }
  };

  const opcoesTrocaTipo: OpcaoMenu[] = trocandoTipoDe
    ? (Object.keys(RECITULO_TIPO) as TipoUsuario[])
        .filter((t) => t !== trocandoTipoDe.tipo_usuario)
        .map((tipo) => ({
          label: `Tornar "${RECITULO_TIPO[tipo]}"`,
          onPress: () => aplicarNovoTipo(trocandoTipoDe, tipo),
        }))
    : [];

  const definirPosicaoAqui = async (membro: Membro) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Preciso da sua localização pra marcar o ponto.');
        return;
      }
      const atual = await Location.getCurrentPositionAsync({});
      await apiFetch(`/user/${membro.id}/location`, {
        method: 'PUT',
        body: JSON.stringify({
          latitude: atual.coords.latitude,
          longitude: atual.coords.longitude,
        }),
      });
      Alert.alert('Pronto', `${nomeExibicao(membro)} posicionado na sua localização atual.`);
    } catch {
      Alert.alert('Erro', 'Não foi possível definir a posição.');
    }
  };

  const abrirModalCoordenadas = (membro: Membro) => {
    setLatitudeDigitada('');
    setLongitudeDigitada('');
    setDefinindoCoordenadasDe(membro);
  };

  const salvarCoordenadasDigitadas = async () => {
    const lat = Number(latitudeDigitada.replace(',', '.'));
    const lon = Number(longitudeDigitada.replace(',', '.'));

    if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      Alert.alert('Coordenadas inválidas', 'Confira os valores de latitude e longitude.');
      return;
    }
    if (!definindoCoordenadasDe) return;

    try {
      await apiFetch(`/user/${definindoCoordenadasDe.id}/location`, {
        method: 'PUT',
        body: JSON.stringify({ latitude: lat, longitude: lon }),
      });
      Alert.alert('Pronto', 'Posição definida com sucesso.');
      setDefinindoCoordenadasDe(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as coordenadas.');
    }
  };

  const confirmarReset = (membro: Membro) => {
    Alert.alert(
      'Resetar código?',
      `O código atual de ${nomeExibicao(membro)} deixará de funcionar imediatamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Resetar', style: 'destructive', onPress: () => resetarCodigo(membro) },
      ]
    );
  };

  const opcoesMembro: OpcaoMenu[] = membroSelecionado
    ? [
        {
          label: 'Ver dados',
          onPress: () => router.push({ pathname: '/membro-detalhes', params: { id: String(membroSelecionado.id) } }),
        },
        ...(membroSelecionado.tipo_usuario === 'local'
          ? [
              {
                label: 'Definir posição aqui (usar minha localização atual)',
                onPress: () => definirPosicaoAqui(membroSelecionado),
              },
              {
                label: 'Definir posição digitando coordenadas',
                onPress: () => abrirModalCoordenadas(membroSelecionado),
              },
            ]
          : [
              { label: 'Resetar código de acesso', onPress: () => confirmarReset(membroSelecionado) },
              membroSelecionado.is_admin
                ? {
                    label: 'Rebaixar para peregrino',
                    destrutivo: true,
                    onPress: () => rebaixarAdmin(membroSelecionado),
                  }
                : { label: 'Promover a admin', onPress: () => promoverAdmin(membroSelecionado) },
            ]),
        { label: 'Trocar tipo', onPress: () => setTrocandoTipoDe(membroSelecionado) },
      ]
    : [];

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
              <TouchableOpacity style={styles.itemMembro} onPress={() => setMembroSelecionado(item)}>
                <View style={styles.infoMembro}>
                  <Text style={styles.nomeMembro}>{nomeExibicao(item)}</Text>
                  {item.tipo_usuario !== 'peregrino' && (
                    <Text style={styles.subtituloMembro}>{RECITULO_TIPO[item.tipo_usuario]}</Text>
                  )}
                </View>
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

        <MenuAcoes
          visivel={membroSelecionado !== null}
          titulo={membroSelecionado ? nomeExibicao(membroSelecionado) : undefined}
          subtitulo={membroSelecionado ? `Tipo: ${RECITULO_TIPO[membroSelecionado.tipo_usuario]}` : undefined}
          opcoes={opcoesMembro}
          aoFechar={() => setMembroSelecionado(null)}
        />

        <MenuAcoes
          visivel={trocandoTipoDe !== null}
          titulo="Trocar tipo"
          subtitulo={trocandoTipoDe ? `Tipo atual: ${RECITULO_TIPO[trocandoTipoDe.tipo_usuario]}` : undefined}
          opcoes={opcoesTrocaTipo}
          aoFechar={() => setTrocandoTipoDe(null)}
        />

        <Modal
          visible={definindoCoordenadasDe !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDefinindoCoordenadasDe(null)}
        >
          <Pressable style={styles.fundoModal} onPress={() => setDefinindoCoordenadasDe(null)}>
            <Pressable style={styles.folhaModal} onPress={() => {}}>
              <Text style={styles.tituloModal}>
                Posição de {definindoCoordenadasDe ? nomeExibicao(definindoCoordenadasDe) : ''}
              </Text>

              <Text style={styles.rotuloCampoModal}>Latitude</Text>
              <TextInput
                style={styles.inputModal}
                value={latitudeDigitada}
                onChangeText={setLatitudeDigitada}
                placeholder="Ex: -22.8508"
                keyboardType="numbers-and-punctuation"
              />

              <Text style={styles.rotuloCampoModal}>Longitude</Text>
              <TextInput
                style={styles.inputModal}
                value={longitudeDigitada}
                onChangeText={setLongitudeDigitada}
                placeholder="Ex: -45.2356"
                keyboardType="numbers-and-punctuation"
              />

              <TouchableOpacity style={styles.botao} onPress={salvarCoordenadasDigitadas}>
                <Text style={styles.textoBotao}>Salvar posição</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoCancelarModal}
                onPress={() => setDefinindoCoordenadasDe(null)}
              >
                <Text style={styles.textoCancelarModal}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
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
  infoMembro: { flex: 1 },
  nomeMembro: { fontSize: 16 },
  subtituloMembro: { fontSize: 12, color: '#888', marginTop: 2 },
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
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  folhaModal: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  tituloModal: { fontSize: 17, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  rotuloCampoModal: { fontSize: 13, color: '#444', marginBottom: 4, marginTop: 8 },
  inputModal: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  botaoCancelarModal: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  textoCancelarModal: { color: '#888', fontSize: 15 },
});