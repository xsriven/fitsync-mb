import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { getDatabase } from '../services/database';
import { auth } from '../../firebaseConfig'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons'; 

export default function LoginScreen({ navigation }: any) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'aluno' | 'personal'>('aluno'); 
  const [modoCadastro, setModoCadastro] = useState(false);
  const [loading, setLoading] = useState(false);

  const [mensagemErro, setMensagemErro] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState('');

  const alternarModo = () => {
    if (tipoUsuario === 'aluno' && !modoCadastro) {
      Alert.alert('Aviso', 'Alunos devem ser cadastrados diretamente pelo painel do seu Personal.');
      return;
    }
    setModoCadastro(!modoCadastro);
    setMensagemErro('');
    setMensagemSucesso('');
    setSenha('');
    setNome('');
  };

  const handleLogin = async () => {
    setMensagemErro('');
    setMensagemSucesso('');

    if (!email || !senha) {
      setMensagemErro('Preencha todos os campos.');
      return;
    }
    
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, senha);
      const firebaseUID = userCredential.user.uid;

      const database = await getDatabase();
      let usuarioLocal: any = null;

      if (tipoUsuario === 'personal') {
        usuarioLocal = await database.getFirstAsync('SELECT * FROM personais WHERE id = ?', [firebaseUID]);
      } else {
        usuarioLocal = await database.getFirstAsync('SELECT * FROM alunos WHERE id = ? AND status = 1', [firebaseUID]);
      }

      if (usuarioLocal) {
        setMensagemSucesso(`Acesso autorizado!`);
        setTimeout(() => {
          if (tipoUsuario === 'personal') {
            navigation.replace('HomePersonal', { tipo: tipoUsuario, usuarioId: firebaseUID, nome: usuarioLocal.nome });
          } else {
            navigation.replace('HomeAluno', { tipo: tipoUsuario, usuarioId: firebaseUID, nome: usuarioLocal.nome });
          }
        }, 1000);
      } else {
        setMensagemErro('Perfil não encontrado localmente.');
      }
    } catch (error: any) {
      console.error(error);
      setMensagemErro('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastroPersonal = async () => {
    setMensagemErro('');
    setMensagemSucesso('');

    if (!email || !senha || !nome) {
      setMensagemErro('Preencha todos os campos.');
      return;
    }

    if (senha.length < 8) {
      setMensagemErro('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const firebaseUID = userCredential.user.uid;

      const database = await getDatabase();
      // Retornou para o formato original sem o crm
      await database.runAsync(
        'INSERT INTO personais (id, nome, email) VALUES (?, ?, ?)', 
        [firebaseUID, nome, email]
      );

      setMensagemSucesso('Conta criada com sucesso!');
      setTimeout(() => {
        setSenha('');
        setNome('');
        setModoCadastro(false);
        setMensagemSucesso('');
      }, 1500);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setMensagemErro('Este e-mail já está em uso.');
      } else {
        setMensagemErro('Falha ao registrar conta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardCentral}>
        <Text style={styles.logo}>FitSync</Text>
        <Text style={styles.subtitle}>
          {modoCadastro ? 'CRIAR CONTA DE PERSONAL' : 'IDENTIFIQUE-SE'}
        </Text>

        {!modoCadastro && (
          <View style={styles.seletorContainer}>
            <TouchableOpacity style={[styles.seletorBotao, tipoUsuario === 'aluno' && styles.seletorAtivo]} onPress={() => setTipoUsuario('aluno')}>
              <Text style={[styles.seletorTexto, tipoUsuario === 'aluno' && styles.seletorTextoAtivo]}>Aluno</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.seletorBotao, tipoUsuario === 'personal' && styles.seletorAtivo]} onPress={() => setTipoUsuario('personal')}>
              <Text style={[styles.seletorTexto, tipoUsuario === 'personal' && styles.seletorTextoAtivo]}>Personal</Text>
            </TouchableOpacity>
          </View>
        )}

        {mensagemErro ? (
          <View style={styles.caixaErro}>
            <Ionicons name="warning-outline" size={16} color="#FF4444" style={{ marginRight: 6 }} />
            <Text style={styles.textoMensagemErro}>{mensagemErro}</Text>
          </View>
        ) : null}

        {mensagemSucesso ? (
          <View style={styles.caixaSucesso}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#39FF14" style={{ marginRight: 6 }} />
            <Text style={styles.textoMensagemSucesso}>{mensagemSucesso}</Text>
          </View>
        ) : null}

        {modoCadastro && (
          <TextInput style={styles.input} placeholder="Nome Completo" placeholderTextColor="#666" value={nome} onChangeText={setNome} />
        )}

        <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#666" value={senha} onChangeText={setSenha} secureTextEntry />

        {loading ? (
          <ActivityIndicator size="large" color="#39FF14" style={{ marginVertical: 15 }} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={modoCadastro ? handleCadastroPersonal : handleLogin}>
            <Text style={styles.buttonText}>{modoCadastro ? 'CADASTRAR' : 'ENTRAR'}</Text>
          </TouchableOpacity>
        )}

        {(tipoUsuario === 'personal' || modoCadastro) && (
          <TouchableOpacity style={styles.alternarContainer} onPress={alternarModo}>
            <Text style={styles.alternarTexto}>
              {modoCadastro ? 'Voltar para o Login' : 'Cadastre-se aqui'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'center', padding: 20 },
  cardCentral: { backgroundColor: '#262626', padding: 25, borderRadius: 16, borderWidth: 1, borderColor: '#333', elevation: 5 },
  logo: { fontSize: 36, fontWeight: '900', color: '#39FF14', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2 },
  subtitle: { fontSize: 11, color: '#A0AEC0', textAlign: 'center', marginBottom: 25, fontWeight: '700', letterSpacing: 1 },
  seletorContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#1A1A1A', borderRadius: 10, padding: 4, borderWidth: 1, borderColor: '#333' },
  seletorBotao: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  seletorAtivo: { backgroundColor: '#262626', borderWidth: 1, borderColor: '#39FF14' },
  seletorTexto: { fontSize: 14, fontWeight: 'bold', color: '#777' },
  seletorTextoAtivo: { color: '#39FF14' },
  caixaErro: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3D1A1A', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#FF4444' },
  caixaSucesso: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A3D1A', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#39FF14' },
  textoMensagemErro: { color: '#FF8888', fontSize: 13, fontWeight: '500' },
  textoMensagemSucesso: { color: '#88FF88', fontSize: 13, fontWeight: '500' },
  input: { backgroundColor: '#1A1A1A', padding: 14, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#333', color: '#FFF', fontSize: 15 },
  button: { backgroundColor: '#39FF14', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 5 },
  buttonText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
  alternarContainer: { marginTop: 20, padding: 5 },
  alternarTexto: { color: '#A0AEC0', textAlign: 'center', fontSize: 13, textDecorationLine: 'underline' }
});