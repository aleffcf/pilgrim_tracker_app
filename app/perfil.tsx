import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFetch } from '../lib/api';

export default function Perfil() {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [idade, setIdade] = useState('');
  const [tipoSanguineo, setTipoSanguineo] = useState('');
  const [telefone, setTelefone] = useState('');
  const [contatoNome, setContatoNome] = useState('');
  const [contatoTelefone, setContatoTelefone] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const dados = await apiFetch('/me');
        setNome(dados.nome ?? '');
        setSobrenome(dados.sobrenome ?? '');
        setIdade(dados.idade != null ? String(dados.idade) : '');
        setTipoSanguineo(dados.tipo_sanguineo ?? '');
        setTelefone(dados.telefone ?? '');
        setContatoNome(dados.contato_emergencia_nome ?? '');
        setContatoTelefone(dados.contato_emergencia_telefone ?? '');
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar seu perfil.');
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const salvar = async () => {
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
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          nome: nome.trim(),
          sobrenome: sobrenome || null,
          idade: idade ? Number(idade) : null,
          tipo_sanguineo: tipoSanguineo || null,
          telefone: telefone || null,
          contato_emergencia_nome: contatoNome || null,
          contato_emergencia_telefone: contatoTelefone || null,
        }),
      });
      Alert.alert('Pronto', 'Seu perfil foi atualizado.');
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.containerCarregando}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Meu perfil' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.ajuda}>
            Essas informações ajudam os organizadores a te apoiar melhor em caso de
            necessidade.
          </Text>

          <Text style={styles.rotulo}>Nome *</Text>
          <TextInput style={styles.input} value={nome} onChangeText={setNome} />

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
          <TextInput style={styles.input} value={contatoNome} onChangeText={setContatoNome} />

          <Text style={styles.rotulo}>Telefone do contato</Text>
          <TextInput
            style={styles.input}
            value={contatoTelefone}
            onChangeText={setContatoTelefone}
            keyboardType="phone-pad"
          />

          <TouchableOpacity style={styles.botao} onPress={salvar} disabled={salvando}>
            <Text style={styles.textoBotao}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerCarregando: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  usuario: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
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
  botao: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  textoBotao: { color: '#fff', fontSize: 16, fontWeight: '600' },
});