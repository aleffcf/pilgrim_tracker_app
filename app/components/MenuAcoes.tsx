import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';

export type OpcaoMenu = {
  label: string;
  onPress: () => void;
  destrutivo?: boolean;
};

type Props = {
  visivel: boolean;
  titulo?: string;
  subtitulo?: string;
  opcoes: OpcaoMenu[];
  aoFechar: () => void;
};

/**
 * Substitui Alert.alert pra menus com várias opções — no Android, Alert.alert
 * só renderiza até 3 botões (o resto some silenciosamente), então qualquer
 * menu com mais opções precisa ser isso aqui em vez do Alert nativo.
 * Sempre tem um botão "Fechar" explícito, e fechar tocando fora também funciona.
 */
export default function MenuAcoes({ visivel, titulo, subtitulo, opcoes, aoFechar }: Props) {
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <Pressable style={styles.fundo} onPress={aoFechar}>
        <Pressable style={styles.folha} onPress={() => {}}>
          {titulo && <Text style={styles.titulo}>{titulo}</Text>}
          {subtitulo && <Text style={styles.subtitulo}>{subtitulo}</Text>}

          {opcoes.map((opcao, indice) => (
            <TouchableOpacity
              key={indice}
              style={styles.item}
              onPress={() => {
                aoFechar();
                opcao.onPress();
              }}
            >
              <Text style={[styles.textoItem, opcao.destrutivo && styles.textoDestrutivo]}>
                {opcao.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.botaoFechar} onPress={aoFechar}>
            <Text style={styles.textoFechar}>Fechar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  folha: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  titulo: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitulo: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 12 },
  item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  textoItem: { fontSize: 16, textAlign: 'center', color: '#007AFF' },
  textoDestrutivo: { color: '#D32F2F' },
  botaoFechar: { marginTop: 12, paddingVertical: 14, backgroundColor: '#f2f2f2', borderRadius: 10 },
  textoFechar: { fontSize: 16, textAlign: 'center', fontWeight: '600', color: '#333' },
});