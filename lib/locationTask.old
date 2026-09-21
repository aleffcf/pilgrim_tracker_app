import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { apiFetch } from './api';

export const LOCATION_TASK_NAME = 'romaria-location-task';

// Precisa ser definida no escopo do módulo (fora de qualquer componente),
// e este arquivo precisa ser importado cedo (ex: no _layout.tsx raiz),
// senão o SO pode acordar o app em segundo plano sem a task registrada.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  console.log('[locationTask] callback disparado', { temErro: !!error, temDados: !!data });

  if (error) {
    console.error('Erro na task de localização:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  const ultima = locations[locations.length - 1];
  if (!ultima) return;

  console.log('[locationTask] enviando posição', ultima.coords.latitude, ultima.coords.longitude);

  try {
    await apiFetch('/location', {
      method: 'POST',
      body: JSON.stringify({
        latitude: ultima.coords.latitude,
        longitude: ultima.coords.longitude,
      }),
    });
    console.log('[locationTask] posição enviada com sucesso');
  } catch (erro) {
    // Falha silenciosa aqui é intencional: sem rede momentaneamente não
    // deve travar nada, a próxima atualização tenta de novo sozinha.
    console.error('[locationTask] Falha ao enviar localização em segundo plano:', erro);
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
    accuracy: Location.Accuracy.Highest, // DEBUG: mais agressivo pra forçar updates mais rápido
    timeInterval: 10000, // DEBUG: 10s (depois volta pra 30000 em produção)
    distanceInterval: 5, // DEBUG: 5m (depois volta pra 25 em produção)
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

/** DEBUG: confirma se a task está mesmo registrada e ativa no SO. */
export async function diagnosticarRastreamento() {
  const tasks = await TaskManager.getRegisteredTasksAsync();
  const estaRodando = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  console.log('[diagnostico] tasks registradas:', tasks.map((t) => t.taskName));
  console.log('[diagnostico] location task rodando:', estaRodando);

  const fgStatus = await Location.getForegroundPermissionsAsync();
  const bgStatus = await Location.getBackgroundPermissionsAsync();
  console.log('[diagnostico] permissão foreground:', fgStatus.status, fgStatus.granted);
  console.log('[diagnostico] permissão background:', bgStatus.status, bgStatus.granted);
}