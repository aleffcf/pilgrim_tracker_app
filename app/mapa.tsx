import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Alert,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiFetch, getToken, clearSession } from '../lib/api';
import { iniciarRastreamento } from '../lib/locationTask';

const INTERVALO_POLLING_MS = 15000; // busca os outros peregrinos a cada 15s
const DELTA_PADRAO = 0.05;

type Pessoa = {
  id: number;
  nome: string | null;
  sobrenome: string | null;
  tipo_sanguineo: string | null;
  latitude: number;
  longitude: number;
  last_seen_at: string;
  sos_ativo: boolean;
};

/** Nome de exibição — cai pra um rótulo genérico se ainda não preencheu o perfil. */
function nomeExibicao(p: { nome: string | null; sobrenome: string | null }): string {
  const partes = [p.nome, p.sobrenome].filter(Boolean);
  return partes.length > 0 ? partes.join(' ') : 'Peregrino sem nome cadastrado';
}

type MeInfo = {
  id: number;
  is_admin: boolean;
  sos_ativo: boolean;
};

export default function Mapa() {
  const mapRef = useRef<MapView | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [carregandoLocalizacaoInicial, setCarregandoLocalizacaoInicial] = useState(true);
  const [regiaoInicial, setRegiaoInicial] = useState({
    latitude: -22.8508,
    longitude: -45.2356,
    latitudeDelta: DELTA_PADRAO,
    longitudeDelta: DELTA_PADRAO,
  });
  const [localizacao, setLocalizacao] = useState<Location.LocationObject | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [rota, setRota] = useState<{ latitude: number; longitude: number }[]>([]);
  const [me, setMe] = useState<MeInfo | null>(null);
  const [enviandoSos, setEnviandoSos] = useState(false);

  const [buscaAberta, setBuscaAberta] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');

  const buscarPessoas = async () => {
    try {
      const dados = await apiFetch('/pessoas');
      setPessoas(dados);
    } catch (erro: any) {
      if (erro.message?.includes('401')) {
        await clearSession();
        router.replace('/login');
      }
    }

    // Atualiza o próprio status de SOS junto — se um admin resolver o
    // alerta, o botão volta ao normal sozinho no próximo ciclo.
    try {
      const meAtualizado = await apiFetch('/me');
      setMe(meAtualizado);
    } catch {
      // Se essa chamada falhar isoladamente, não é crítico — tenta de novo
      // no próximo ciclo do polling.
    }
  };

  const buscarRota = async () => {
    try {
      const dados = await apiFetch('/tenant/route');
      setRota(dados.points || []);
    } catch {
      // Sem rota configurada ainda não é erro — só não desenha nada.
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const meDados = await apiFetch('/me');
        setMe(meDados);
      } catch {
        // Se /me falhar por token inválido, o buscarPessoas abaixo já vai
        // detectar o 401 e redirecionar pro login.
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const ultimaConhecida = await Location.getLastKnownPositionAsync();
        if (ultimaConhecida) {
          setRegiaoInicial({
            latitude: ultimaConhecida.coords.latitude,
            longitude: ultimaConhecida.coords.longitude,
            latitudeDelta: DELTA_PADRAO,
            longitudeDelta: DELTA_PADRAO,
          });
          setLocalizacao(ultimaConhecida);
        }
        setCarregandoLocalizacaoInicial(false);

        Location.getCurrentPositionAsync({}).then((localAtual) => {
          setLocalizacao(localAtual);
          mapRef.current?.animateToRegion(
            {
              latitude: localAtual.coords.latitude,
              longitude: localAtual.coords.longitude,
              latitudeDelta: DELTA_PADRAO,
              longitudeDelta: DELTA_PADRAO,
            },
            800
          );
        });
      } else {
        setCarregandoLocalizacaoInicial(false);
      }

      const rastreamentoOk = await iniciarRastreamento();
      if (!rastreamentoOk) {
        Alert.alert(
          'Permissão necessária',
          'Sem a permissão de localização (inclusive em segundo plano), seu grupo não vai conseguir te encontrar no mapa.'
        );
      }

      await buscarRota();
      await buscarPessoas();
      intervaloRef.current = setInterval(buscarPessoas, INTERVALO_POLLING_MS);
    })();

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  const irParaPessoa = (pessoa: Pessoa) => {
    mapRef.current?.animateToRegion(
      {
        latitude: pessoa.latitude,
        longitude: pessoa.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      800
    );
    setBuscaAberta(false);
    setTermoBusca('');
  };

  const resultadosBusca = pessoas.filter((p) =>
    nomeExibicao(p).toLowerCase().includes(termoBusca.toLowerCase())
  );

  const confirmarSos = () => {
    Alert.alert(
      'Pedir socorro?',
      'Isso vai avisar imediatamente os organizadores do seu grupo de que você precisa de apoio. Só use em caso de necessidade real.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sim, pedir socorro', style: 'destructive', onPress: enviarSos },
      ]
    );
  };

  const enviarSos = async () => {
    setEnviandoSos(true);
    try {
      await apiFetch('/sos', { method: 'POST' });
      // Atualização otimista — não espera o próximo polling pra já trocar
      // o botão, já que a intenção é deixar claro que o pedido foi registrado.
      setMe((atual) => (atual ? { ...atual, sos_ativo: true } : atual));
      Alert.alert('Alerta enviado', 'Os organizadores do seu grupo foram avisados.');
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o alerta. Tente novamente.');
    } finally {
      setEnviandoSos(false);
    }
  };

  const resolverSos = async (pessoa: Pessoa) => {
    try {
      await apiFetch(`/sos/${pessoa.id}/resolver`, { method: 'POST' });
      await buscarPessoas();
    } catch {
      Alert.alert('Erro', 'Não foi possível marcar como resolvido.');
    }
  };

  const tocarPessoa = (pessoa: Pessoa) => {
    if (me?.is_admin && pessoa.sos_ativo) {
      Alert.alert(
        `${nomeExibicao(pessoa)} pediu socorro`,
        pessoa.tipo_sanguineo ? `Tipo sanguíneo: ${pessoa.tipo_sanguineo}\n\nDepois de prestar apoio, marque como resolvido para limpar o alerta.` : 'Depois de prestar apoio, marque como resolvido para limpar o alerta.',
        [
          { text: 'Fechar', style: 'cancel' },
          { text: 'Marcar como resolvido', onPress: () => resolverSos(pessoa) },
        ]
      );
    }
  };

  const abrirMenu = () => {
    const opcoes: any[] = [
      { text: 'Meu perfil', onPress: () => router.push('/perfil') },
    ];
    if (me?.is_admin) {
      opcoes.push({ text: 'Membros do grupo', onPress: () => router.push('/membros') });
      opcoes.push({ text: 'Alertas de SOS', onPress: () => router.push('/alertas') });
      opcoes.push({ text: 'Cadastrar peregrino', onPress: () => router.push('/cadastrar-usuario') });
    }
    opcoes.push({
      text: 'Sair',
      style: 'destructive',
      onPress: async () => {
        await clearSession();
        router.replace('/');
      },
    });
    opcoes.push({ text: 'Cancelar', style: 'cancel' });

    Alert.alert('Menu', undefined, opcoes);
  };

  if (carregandoLocalizacaoInicial) {
    return (
      <SafeAreaView style={styles.containerCarregando}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={regiaoInicial}
        >
          {rota.length > 1 && (
            <Polyline coordinates={rota} strokeColor="#007AFF" strokeWidth={4} />
          )}

          {/* Não desenhamos mais um marcador separado "Você" — o próprio
              usuário já aparece na lista de /pessoas, igual todo mundo,
              evitando duplicar o pin com a posição do GPS local do aparelho. */}

          {pessoas.map((pessoa) => (
            <Marker
              key={pessoa.id}
              coordinate={{ latitude: pessoa.latitude, longitude: pessoa.longitude }}
              title={nomeExibicao(pessoa)}
              description={
                [
                  pessoa.tipo_sanguineo ? `Tipo sanguíneo: ${pessoa.tipo_sanguineo}` : null,
                  me?.is_admin && pessoa.sos_ativo ? '⚠️ Pediu socorro' : null,
                ]
                  .filter(Boolean)
                  .join(' — ') || undefined
              }
              pinColor={me?.is_admin && pessoa.sos_ativo ? 'red' : undefined}
              onPress={() => tocarPessoa(pessoa)}
            />
          ))}
        </MapView>

        {/* Menu (canto superior esquerdo) */}
        <TouchableOpacity style={styles.botaoMenu} onPress={abrirMenu} accessibilityLabel="Menu">
          <Text style={styles.iconeBotao}>☰</Text>
        </TouchableOpacity>

        {/* Busca (canto superior direito) */}
        <TouchableOpacity
          style={styles.botaoBusca}
          onPress={() => setBuscaAberta(true)}
          accessibilityLabel="Buscar peregrino"
        >
          <Text style={styles.iconeBotao}>🔍</Text>
        </TouchableOpacity>

        {/* SOS (canto inferior direito) — vira "Aguarde" enquanto o pedido
            estiver ativo, pra não deixar disparar um segundo alerta */}
        <TouchableOpacity
          style={[styles.botaoSos, me?.sos_ativo && styles.botaoSosAtivo]}
          onPress={me?.sos_ativo ? undefined : confirmarSos}
          disabled={enviandoSos || me?.sos_ativo}
          accessibilityLabel={me?.sos_ativo ? 'Pedido de socorro em andamento' : 'Pedir socorro'}
        >
          {enviandoSos ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.textoSos}>{me?.sos_ativo ? 'Aguarde' : 'SOS'}</Text>
          )}
        </TouchableOpacity>

        {buscaAberta && (
          <View style={styles.painelBusca}>
            <View style={styles.linhaBusca}>
              <TextInput
                style={styles.inputBusca}
                placeholder="Nome do peregrino..."
                value={termoBusca}
                onChangeText={setTermoBusca}
                autoFocus
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => {
                  setBuscaAberta(false);
                  setTermoBusca('');
                }}
                style={styles.botaoFechar}
              >
                <Text style={styles.textoFechar}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={resultadosBusca}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              style={styles.listaResultados}
              ListEmptyComponent={
                termoBusca.length > 0 ? (
                  <Text style={styles.semResultado}>Nenhum peregrino encontrado</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.itemResultado} onPress={() => irParaPessoa(item)}>
                  <Text style={styles.textoItemResultado}>
                    {nomeExibicao(item)}
                    {item.sos_ativo && me?.is_admin ? ' ⚠️' : ''}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerCarregando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  botaoMenu: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  botaoBusca: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  iconeBotao: { fontSize: 20 },
  botaoSos: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    backgroundColor: '#D32F2F',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  textoSos: { color: '#fff', fontWeight: '800', fontSize: 16 },
  botaoSosAtivo: { backgroundColor: '#9E9E9E' },
  painelBusca: {
    position: 'absolute',
    top: 72,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    maxHeight: 320,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  linhaBusca: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputBusca: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  botaoFechar: { paddingHorizontal: 8, paddingVertical: 10 },
  textoFechar: { color: '#007AFF', fontWeight: '600' },
  listaResultados: { marginTop: 8 },
  itemResultado: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  textoItemResultado: { fontSize: 16 },
  semResultado: { textAlign: 'center', color: '#999', paddingVertical: 16 },
});