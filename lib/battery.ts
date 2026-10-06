import { Platform, Linking } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

/**
 * Tenta abrir direto a tela de exceções de otimização de bateria do Android
 * (funciona na maioria dos Androids "puros" e em boa parte das customizações
 * de fabricante). Se a intent específica falhar, cai para a tela de
 * informações do próprio app, de onde a pessoa navega manualmente.
 */
export async function abrirConfiguracoesBateria(): Promise<void> {
  if (Platform.OS !== 'android') {
    return; // iOS não tem esse conceito de otimização de bateria por app
  }

  try {
    await IntentLauncher.startActivityAsync(
      'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'
    );
  } catch {
    // Fallback: abre a tela de informações do próprio app
    Linking.openSettings();
  }
}