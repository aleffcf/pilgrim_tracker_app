import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { UrlTile, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiFetch, getToken, clearSession } from './api';
import { iniciarRastreamento } from '../app/locationTask';

const INTERVALO_POLLING_MS = 15000; // busca os outros peregrinos a cada 15s

type Pessoa = {
  id: number;
  username: string;
  latitude: number;
  longitude: number;
  last_seen_at: string;
};

export default function Mapa() {
  const [localizacao, setLocalizacao] = useState<Location.LocationObject | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [regiaoInicial, setRegiaoInicial] = useState({
    latitude: -22.8508, // Basílica de Aparecida, como fallback antes do GPS responder
    longitude: -45.2356,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

      // Localização inicial, só pra centralizar o mapa rápido
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const localAtual = await Location.getCurrentPositionAsync({});
        setLocalizacao(localAtual);
        setRegiaoInicial({
          latitude: localAtual.coords.latitude,
          longitude: localAtual.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }

      // Começa a enviar a própria posição em segundo plano
      const rastreamentoOk = await iniciarRastreamento();
      if (!rastreamentoOk) {
        Alert.alert(
          'Permissão necessária',
          'Sem a permissão de localização (inclusive em segundo plano), seu grupo não vai conseguir te encontrar no mapa.'
        );
      }

      // Busca os outros peregrinos agora e depois periodicamente
      await buscarPessoas();
      intervaloRef.current = setInterval(buscarPessoas, INTERVALO_POLLING_MS);
    })();

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <MapView style={styles.map} initialRegion={regiaoInicial}>
          <UrlTile
            urlTemplate="https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

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
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
