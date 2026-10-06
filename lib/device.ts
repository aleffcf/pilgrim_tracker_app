import { Platform } from 'react-native';
import * as Application from 'expo-application';

/**
 * Identificador estável do aparelho, usado pra vincular o código de acesso
 * a um único dispositivo. Não muda ao reinstalar o app (diferente de um
 * UUID gerado e salvo no SecureStore, que se perderia nesse caso).
 */
export async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'android') {
    // Estável por instalação do Android — muda só em reset de fábrica.
    return Application.getAndroidId() ?? 'android-desconhecido';
  }

  if (Platform.OS === 'ios') {
    const id = await Application.getIosIdForVendorAsync();
    return id ?? 'ios-desconhecido';
  }

  return 'plataforma-desconhecida';
}