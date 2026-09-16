import { Stack } from "expo-router";
// Import cedo garante que a task de background fique registrada assim que
// o app inicia, mesmo antes do usuário abrir a tela do mapa.
import "../lib/locationTask";

export default function RootLayout() {
  return <Stack />;
}
