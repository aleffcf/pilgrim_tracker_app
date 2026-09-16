import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { apiFetch } from '../lib/api';

export const LOCATION_TASK_NAME = 'romaria-location-task';

// Precisa ser definida no escopo do módulo (fora de qualquer componente),
// e este arquivo precisa ser importado cedo (ex: no _layout.tsx raiz),
// senão o SO pode acordar o app em segundo plano sem a task registrada.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Erro na task de localização:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const ultima = locations[locations.length - 1];
  if (!ultima) return;

  try {
    await apiFetch('/location', {
      method: 'POST',
      body: JSON.stringify({
        latitude: ultima.coords.latitude,
        longitude: ultima.coords.longitude,
      }),
    });
  } catch (erro) {
    // Falha silenciosa aqui é intencional: sem rede momentaneamente não
    // deve travar nada, a próxima atualização tenta de novo sozinha.
    console.error('Falha ao enviar localização em segundo plano:', erro);
  }
});

/**
 * Pede as permissões necessárias e inicia o envio periódico da localização,
 * mesmo com o app minimizado. Retorna false se alguma permissão for negada.
 */
export async function iniciarRastreamento(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return false;

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return false;

  const jaRodando = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (jaRodando) return true;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000, // manda posição no máximo a cada 30s
    distanceInterval: 25, // ou quando andar 25 metros, o que vier primeiro
    showsBackgroundLocationIndicator: true, // iOS: mostra que está rastreando
    foregroundService: {
      // Android exige uma notificação visível durante rastreamento em segundo plano
      notificationTitle: 'Compartilhando localização',
      notificationBody: 'Seu grupo consegue ver onde você está na romaria.',
    },
  });

  return true;
}

export async function pararRastreamento() {
  const jaRodando = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (jaRodando) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
