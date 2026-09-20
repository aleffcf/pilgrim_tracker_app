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
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiFetch, getToken, clearSession } from '../lib/api';
import { iniciarRastreamento } from '../lib/locationTask';

const INTERVALO_POLLING_MS = 15000; // busca os outros peregrinos a cada 15s
const DELTA_PADRAO = 0.05;

type Pessoa = {
  id: number;
  username: string;
  latitude: number;
  longitude: number;
  last_seen_at: string;
};

export default function Mapa() {
  const mapRef = useRef<MapView | null>(null);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [carregandoLocalizacaoInicial, setCarregandoLocalizacaoInicial] = useState(true);
  const [regiaoInicial, setRegiaoInicial] = useState({
    latitude: -22.8508, // Basílica de Aparecida — só usado se não houver NENHUM fix disponível
    longitude: -45.2356,
    latitudeDelta: DELTA_PADRAO,
    longitudeDelta: DELTA_PADRAO,
  });
  const [localizacao, setLocalizacao] = useState<Location.LocationObject | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);

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
      // Outros erros (rede instável no caminho) não interrompem o polling —
      // só tenta de novo no próximo ciclo.
    }
  };

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        router.replace('/login');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // getLastKnownPositionAsync devolve um fix em cache quase instantâneo
        // (pode ser de minutos atrás) — evita abrir na Basílica enquanto
        // esperamos um GPS fix novo, que pode levar alguns segundos.
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

        // Em paralelo, busca um fix atualizado e recentraliza o mapa quando
        // chegar — precisa de animateToRegion porque initialRegion só vale
        // na primeira renderização, não reage a mudança de estado.
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
        latitudeDelta: 0.01, // mais próximo, já que é uma busca específica
        longitudeDelta: 0.01,
      },
      800
    );
    setBuscaAberta(false);
    setTermoBusca('');
  };

  const resultadosBusca = pessoas.filter((p) =>
    p.username.toLowerCase().includes(termoBusca.toLowerCase())
  );

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
          {localizacao && (
            <Marker
              coordinate={{
                latitude: localizacao.coords.latitude,
                longitude: localizacao.coords.longitude,
              }}
              title="Você"
              pinColor="blue"
            />
          )}

          {pessoas.map((pessoa) => (
            <Marker
              key={pessoa.id}
              coordinate={{ latitude: pessoa.latitude, longitude: pessoa.longitude }}
              title={pessoa.username}
            />
          ))}
        </MapView>

        {/* Botão de busca flutuante */}
        <TouchableOpacity
          style={styles.botaoBusca}
          onPress={() => setBuscaAberta(true)}
          accessibilityLabel="Buscar peregrino"
        >
          <Text style={styles.iconeBusca}>🔍</Text>
        </TouchableOpacity>

        {/* Painel de busca */}
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
                  <Text style={styles.textoItemResultado}>{item.username}</Text>
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
  iconeBusca: { fontSize: 22 },
  painelBusca: {
    position: 'absolute',
    top: 16,
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