import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

type TipoUsuario = 'peregrino' | 'apoio' | 'local';

const TIPOS: { valor: TipoUsuario; rotulo: string }[] = [
  { valor: 'peregrino', rotulo: 'Peregrino' },
  { valor: 'apoio', rotulo: 'Apoio' },
  { valor: 'local', rotulo: 'Local fixo' },
];

export default function CadastrarUsuario() {
  const [salvando, setSalvando] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('peregrino');
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [idade, setIdade] = useState('');
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');

  const ehLocal = tipoUsuario === 'local';

  // Preenchido só depois de cadastrar com sucesso — troca o formulário
  // pela tela de "aqui está o crachá" com o QR code.
  const [cadastrado, setCadastrado] = useState<{
    nome: string;
    accessCode: string;
    ehLocal: boolean;
  } | null>(null);

  const cadastrar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Nome é obrigatório.');
      return;
    }
    if (idade && Number.isNaN(Number(idade))) {
      Alert.alert('Atenção', 'Idade precisa ser um número.');
      return;
    }

    setSalvando(true);
    try {
      const resultado = await apiFetch('/user', {
        method: 'POST',
        body: JSON.stringify({
          nome: nome.trim(),
          sobrenome: sobrenome || null,
          idade: ehLocal ? null : idade ? Number(idade) : null,
          tipo_sanguineo: ehLocal ? null : tipoSanguineo || null,
          telefone: ehLocal ? null : telefone || null,
          contato_emergencia_nome: ehLocal ? null : contatoNome || null,
          contato_emergencia_telefone: ehLocal ? null : contatoTelefone || null,
          tipo_usuario: tipoUsuario,
        }),
      });

      setCadastrado({
        nome: [resultado.nome, resultado.sobrenome].filter(Boolean).join(' '),
        accessCode: resultado.access_code,
        ehLocal,
      });
    } catch (erro: any) {
      Alert.alert('Erro', erro.message || 'Não foi possível cadastrar o peregrino.');
    } finally {
      setSalvando(false);
    }
  };

  const limparECadastrarOutro = () => {
    setCadastrado(null);
    setTipoUsuario('peregrino');
    setNome('');
    setSobrenome('');
    setIdade('');
    setTipoSanguineo('');
    setTelefone('');
    setContatoNome('');
    setContatoTelefone('');
  };

  // Tela de sucesso: mostra o QR code + código em texto, pra imprimir no crachá
  if (cadastrado) {
    return (
      <>
        <Stack.Screen options={{ title: 'Peregrino cadastrado' }} />
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scrollSucesso}>
            <Text style={styles.tituloSucesso}>{cadastrado.nome}</Text>

            {cadastrado.ehLocal ? (
              <Text style={styles.avisoSucesso}>
                Pontos fixos não precisam de login. Pra posicionar esse ponto no mapa, vá
                em "Membros do grupo", toque nele e escolha "Definir posição aqui" estando
                no local certo.
              </Text>
            ) : (
              <>
                <Text style={styles.avisoSucesso}>
                  Escaneie este QR code (ou digite o código abaixo) na tela de login
                  pessoal do app. Ele só aparece aqui — anote ou imprima agora.
                </Text>

                <View style={styles.qrWrapper}>
                  <QRCode value={cadastrado.accessCode} size={220} />
                </View>

                <Text style={styles.codigoTexto}>{cadastrado.accessCode}</Text>
              </>
            )}

            <TouchableOpacity style={styles.botao} onPress={limparECadastrarOutro}>
              <Text style={styles.textoBotao}>Cadastrar outro peregrino</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoSecundario} onPress={() => router.back()}>
              <Text style={styles.textoBotaoSecundario}>Voltar ao mapa</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Cadastrar peregrino' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.rotulo}>Tipo *</Text>
          <View style={styles.linhaTipos}>
            {TIPOS.map((t) => (
              <TouchableOpacity
                key={t.valor}
                style={[styles.chipTipo, tipoUsuario === t.valor && styles.chipTipoSelecionado]}
                onPress={() => setTipoUsuario(t.valor)}
              >
                <Text
                  style={[
                    styles.textoChipTipo,
                    tipoUsuario === t.valor && styles.textoChipTipoSelecionado,
                  ]}
                >
                  {t.rotulo}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.ajuda}>
            {ehLocal
              ? 'Um ponto fixo no mapa (posto de apoio, ponto de encontro) — não precisa de login, a posição é definida manualmente depois.'
              : 'O código de acesso e o QR code são gerados automaticamente e mostrados só uma vez — anote ou imprima antes de sair dessa tela.'}
          </Text>

          <Text style={styles.rotulo}>{ehLocal ? 'Nome do local *' : 'Nome *'}</Text>
          <TextInput
            style={styles.input}
            value={nome}
            onChangeText={setNome}
            placeholder={ehLocal ? 'Ex: Posto de hidratação 1' : 'Nome do peregrino'}
          />

          {!ehLocal && (
            <>
              <Text style={styles.rotulo}>Sobrenome</Text>
              <TextInput style={styles.input} value={sobrenome} onChangeText={setSobrenome} />

              <Text style={styles.rotulo}>Idade</Text>
              <TextInput
                style={styles.input}
                value={idade}
                onChangeText={setIdade}
                keyboardType="number-pad"
              />

              <Text style={styles.rotulo}>Tipo sanguíneo</Text>
              <TextInput
                style={styles.input}
                value={tipoSanguineo}
                onChangeText={setTipoSanguineo}
                placeholder="Ex: O+"
                autoCapitalize="characters"
              />

              <Text style={styles.rotulo}>Telefone</Text>
              <TextInput
                style={styles.input}
                value={telefone}
                onChangeText={setTelefone}
                keyboardType="phone-pad"
              />

              <Text style={styles.secao}>Contato de emergência</Text>

              <Text style={styles.rotulo}>Nome do contato</Text>
              <TextInput
                style={styles.input}
                value={contatoNome}
                onChangeText={setContatoNome}
              />

              <Text style={styles.rotulo}>Telefone do contato</Text>
              <TextInput
                style={styles.input}
                value={contatoTelefone}
                onChangeText={setContatoTelefone}
                keyboardType="phone-pad"
              />
            </>
          )}

          <TouchableOpacity style={styles.botao} onPress={cadastrar} disabled={salvando}>
            <Text style={styles.textoBotao}>{salvando ? 'Cadastrando...' : 'Cadastrar'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },
  scrollSucesso: { padding: 20, alignItems: 'center' },
  ajuda: { fontSize: 13, color: '#666', marginBottom: 20 },
  rotulo: { fontSize: 13, color: '#444', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  secao: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 4 },
  linhaTipos: { flexDirection: 'row', gap: 8 },
  chipTipo: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  chipTipoSelecionado: { backgroundColor: '#007AFF' },
  textoChipTipo: { color: '#007AFF', fontWeight: '600', fontSize: 13 },
  textoChipTipoSelecionado: { color: '#fff' },
  botao: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 28,
    width: '100%',
  },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
  botaoSecundario: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  textoBotaoSecundario: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
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
});