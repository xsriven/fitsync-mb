// src/screens/PersonalDashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, Alert, ActivityIndicator, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../services/database';
import { auth } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, signOut, sendEmailVerification } from 'firebase/auth';

interface Aluno { 
  id: string; 
  nome: string; 
  email: string; 
  data_nascimento: string;
  objetivo: string;
  historico_lesao: string;
  status: number; 
}

export default function PersonalDashboardScreen({ route, navigation }: any) {
  const personalId = route.params?.usuarioId;
  const nomePersonal = route.params?.nome || 'Professor';
  const emailPersonal = auth.currentUser?.email || route.params?.email || 'Sem e-mail';

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  
  const [emailVerificado, setEmailVerificado] = useState(auth.currentUser?.emailVerified || false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const [abaAtiva, setAbaAtiva] = useState<'all' | 'cadastro' | 'perfil'>('all');
  const [abaAtivaInterna, setAbaAtivaInterna] = useState<'lista' | 'cadastro' | 'perfil'>('lista');
  const [etapaCadastro, setEtapaCadastro] = useState<1 | 2>(1);

  // form
  const [nome, setNome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [historicoLesao, setHistoricoLesao] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  useEffect(() => {
    if (abaAtivaInterna === 'lista') {
      carregarAlunos();
    }
    if (abaAtivaInterna === 'perfil') {
      auth.currentUser?.reload().then(() => {
        setEmailVerificado(auth.currentUser?.emailVerified || false);
      }).catch((err) => console.log("erro ao validar login do personal:", err));
    }
  }, [abaAtivaInterna]);

  async function carregarAlunos() {
    setCarregandoLista(true);
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<Aluno>(
        'SELECT id, nome, email, data_nascimento, objetivo, historico_lesao, status FROM alunos WHERE personal_id = ? AND status = 1',
        [personalId]
      );
      setAlunos(resultado);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoLista(false);
    }
  }

  async function handleSalvarAluno() {
    if (!email || !senha) {
      Alert.alert('Erro', 'Informe o e-mail e a senha de acesso.');
      return;
    }
    if (senha.length < 8) {
      Alert.alert('Erro', 'A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const alunoUID = userCredential.user.uid;

      const database = await getDatabase();
      await database.runAsync(
        'INSERT INTO alunos (id, personal_id, nome, email, data_nascimento, objetivo, historico_lesao, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
        [alunoUID, personalId, nome.trim(), email.trim(), dataNascimento.trim(), objetivo.trim(), historicoLesao.trim()]
      );

      Alert.alert('Sucesso', 'Aluno matriculado e sincronizado!');
      resetForm();
      setAbaAtivaInterna('lista');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Erro', error.code === 'auth/email-already-in-use' ? 'E-mail já cadastrado.' : 'Erro ao cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível desconectar.');
    }
  }

  async function handleSendVerification() {
    if (!auth.currentUser) return;
    setEnviandoEmail(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Sucesso', 'E-mail de verificação enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível disparar o e-mail.');
    } finally {
      setEnviandoEmail(false);
    }
  }

  async function handleDesativarAluno(idAluno: string) {
    Alert.alert('Remover Aluno', 'Deseja desativar este aluno?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desativar',
        style: 'destructive',
        onPress: async () => {
          try {
            const database = await getDatabase();
            await database.runAsync('UPDATE alunos SET status = 0 WHERE id = ?', [idAluno]);
            carregarAlunos();
          } catch (e) {
            Alert.alert('Erro', 'Erro ao desativar.');
          }
        }
      }
    ]);
  }

  function resetForm() {
    setNome(''); setDataNascimento(''); setHistoricoLesao(''); setObjetivo(''); setEmail(''); setSenha('');
    setEtapaCadastro(1);
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.conteudoCentral}>
        {abaAtivaInterna === 'lista' && (
          <View style={{ flex: 1 }}>
            <Text style={styles.tituloSecao}>ALUNOS ATIVOS</Text>
            {carregandoLista ? (
              <ActivityIndicator size="large" color="#39FF14" style={{ marginTop: 40 }} />
            ) : (
              <FlatList
                data={alunos}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={<Text style={styles.listaVazia}>Nenhum aluno ativo vinculado.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.cardAluno}>
                    <View style={styles.linhaPrincipalCard}>
                      
                      {/* bloco de textos e infos gerais à esquerda */}
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.nomeAluno} numberOfLines={1}>{item.nome}</Text>
                        <Text style={styles.emailAluno} numberOfLines={1}>{item.email}</Text>
                        
                        {/* correção: renderiza a data em uma linha própria abaixo do e-mail */}
                        {item.data_nascimento ? (
                          <View style={styles.linhaDataNascimentoCard}>
                            <Ionicons name="calendar-outline" size={12} color="#777" style={{ marginRight: 4 }} />
                            <Text style={styles.txtDataNascimentoCard}>{item.data_nascimento}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.acoesCard}>
                        <TouchableOpacity style={styles.btnTextoFicha} onPress={() => navigation.navigate('Ficha', { tipo: 'personal', alunoId: item.id })}>
                          <Text style={styles.txtBtnTextoFicha}>TREINOS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnIconeDeletar} onPress={() => handleDesativarAluno(item.id)}>
                          <Ionicons name="trash-outline" size={15} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.containerAnamneseCard}>
                      <View style={styles.boxTagClinica}>
                        <Text style={styles.txtTagLabel}>OBJETIVO:</Text>
                        <Text style={styles.txtTagValue} numberOfLines={1}>{item.objetivo || 'Não informado'}</Text>
                      </View>
                      <View style={styles.boxTagClinica}>
                        <Text style={[styles.txtTagLabel, { color: '#FF4444' }]}>LESÕES/CLÍNICO:</Text>
                        <Text style={styles.txtTagValue} numberOfLines={1}>{item.historico_lesao || 'Nenhum histórico'}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        )}

        {abaAtivaInterna === 'cadastro' && (
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.tituloSecao}>MATRICULAR NOVO ALUNO</Text>
            <View style={styles.cardForm}>
              <Text style={styles.formSubtitle}>PASSO {etapaCadastro} DE 2</Text>
              {loading && <ActivityIndicator size="small" color="#39FF14" style={{ marginBottom: 15 }} />}

              {etapaCadastro === 1 ? (
                <View>
                  <TextInput style={styles.input} placeholder="Nome Completo do Aluno" placeholderTextColor="#666" value={nome} onChangeText={setNome} />
                  <TextInput style={styles.input} placeholder="Nascimento (DD/MM/AAAA)" placeholderTextColor="#666" value={dataNascimento} onChangeText={setDataNascimento} />
                  <TextInput style={styles.input} placeholder="Objetivo de Treino" placeholderTextColor="#666" value={objetivo} onChangeText={setObjetivo} />
                  <TextInput style={[styles.input, { height: 65, textAlignVertical: 'top' }]} placeholder="Histórico Clínico ou Lesões" placeholderTextColor="#666" multiline value={historicoLesao} onChangeText={setHistoricoLesao} />
                  <TouchableOpacity style={styles.btnAcao} onPress={() => nome.trim() ? setEtapaCadastro(2) : Alert.alert('Aviso', 'Preencha o nome.')}>
                    <Text style={styles.btnAcaoTexto}>AVANÇAR</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <TextInput style={styles.input} placeholder="E-mail de Acesso" placeholderTextColor="#666" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                  <TextInput style={styles.input} placeholder="Senha (Mínimo 8 caracteres)" placeholderTextColor="#666" secureTextEntry value={senha} onChangeText={setSenha} />
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={[styles.btnAcao, { flex: 1, backgroundColor: '#333', marginRight: 10 }]} onPress={() => setEtapaCadastro(1)}>
                      <Text style={[styles.btnAcaoTexto, { color: '#FFF' }]}>VOLTAR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btnAcao, { flex: 1 }]} onPress={handleSalvarAluno}>
                      <Text style={styles.btnAcaoTexto}>CONCLUIR</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {abaAtivaInterna === 'perfil' && (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={styles.cardPerfilCentral}>
              <Text style={styles.welcome}>PERFIL DO TREINADOR</Text>
              <Text style={styles.subtitle}>Gerenciamento da sua conta</Text>

              <View style={styles.cardPerfilInfo}>
                <View style={styles.linhaInfo}>
                  <Ionicons name="body-outline" size={18} color="#39FF14" style={{ marginRight: 10 }} />
                  <Text style={styles.txtPerfilDados}>{nomePersonal}</Text>
                </View>
                <View style={styles.linhaInfo}>
                  <Ionicons name="mail-outline" size={18} color="#39FF14" style={{ marginRight: 10 }} />
                  <Text style={styles.txtPerfilDados}>{emailPersonal}</Text>
                </View>
              </View>

              {emailVerificado ? (
                <View style={[styles.statusVerificacao, { borderColor: '#39FF14' }]}>
                  <Ionicons name="checkmark-circle" size={18} color="#39FF14" />
                  <Text style={[styles.txtVerificacao, { color: '#39FF14', marginLeft: 8 }]}>CONTA VERIFICADA NO FIREBASE</Text>
                </View>
              ) : (
                <View style={[styles.statusVerificacao, { borderColor: '#FFCC00' }]}>
                  <Ionicons name="alert-circle" size={18} color="#FFCC00" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.txtVerificacao, { color: '#FFCC00' }]}>E-MAIL NÃO VERIFICADO</Text>
                    <TouchableOpacity onPress={handleSendVerification} disabled={enviandoEmail}>
                      <Text style={styles.txtLinkVerificar}>
                        {enviandoEmail ? 'Enviando link...' : 'Solicitar link de ativação'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.botaoSair} onPress={handleLogout}>
                <Text style={styles.textoBotaoSair}>DESCONECTAR CONTA</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.tabBarContainer}>
        <TouchableOpacity style={[styles.tabBotao, abaAtivaInterna === 'lista' && styles.tabBotaoAtivo]} onPress={() => setAbaAtivaInterna('lista')}>
          <Ionicons name="people" size={20} color={abaAtivaInterna === 'lista' ? '#000' : '#777'} />
          <Text style={[styles.tabTexto, abaAtivaInterna === 'lista' && styles.tabTextoAtivo]}>Alunos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBotao, abaAtivaInterna === 'cadastro' && styles.tabBotaoAtivo]} onPress={() => setAbaAtivaInterna('cadastro')}>
          <Ionicons name="person-add" size={20} color={abaAtivaInterna === 'cadastro' ? '#000' : '#777'} />
          <Text style={[styles.tabTexto, abaAtivaInterna === 'cadastro' && styles.tabTextoAtivo]}>Matricular</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBotao, abaAtivaInterna === 'perfil' && styles.tabBotaoAtivo]} onPress={() => setAbaAtivaInterna('perfil')}>
          <Ionicons name="person" size={20} color={abaAtivaInterna === 'perfil' ? '#000' : '#777'} />
          <Text style={[styles.tabTexto, abaAtivaInterna === 'perfil' && styles.tabTextoAtivo]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A', paddingTop: 10 },
  conteudoCentral: { flex: 1, padding: 15 },
  tituloSecao: { fontSize: 18, fontWeight: '900', color: '#39FF14', marginBottom: 15, textAlign: 'center', letterSpacing: 0.5 },
  listaVazia: { textAlign: 'center', color: '#555', marginTop: 60, fontSize: 14 },
  
  cardAluno: { backgroundColor: '#262626', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  linhaPrincipalCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nomeAluno: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  emailAluno: { fontSize: 11, color: '#A0AEC0', marginTop: 3 },
  
  // estilos corrigidos para a quebra de linha da data
  linhaDataNascimentoCard: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  txtDataNascimentoCard: { fontSize: 11, color: '#777', fontWeight: 'bold' },

  acoesCard: { flexDirection: 'row', alignItems: 'center' },
  containerAnamneseCard: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1A1A1A' },
  boxTagClinica: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  txtTagLabel: { fontSize: 9, fontWeight: '900', color: '#39FF14', width: 95 },
  txtTagValue: { fontSize: 12, color: '#E2E8F0', flex: 1 },

  btnTextoFicha: { backgroundColor: '#39FF14', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginRight: 8 },
  txtBtnTextoFicha: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  btnIconeDeletar: { backgroundColor: '#FF4444', width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  cardForm: { backgroundColor: '#262626', padding: 20, borderRadius: 14, borderWidth: 1, borderColor: '#333' },
  formSubtitle: { fontSize: 12, fontWeight: '900', color: '#39FF14', marginBottom: 15, textAlign: 'center' },
  input: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#333', color: '#FFF', fontSize: 14 },
  btnAcao: { backgroundColor: '#39FF14', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  btnAcaoTexto: { color: '#000', fontWeight: '900', fontSize: 13 },
  cardPerfilCentral: { backgroundColor: '#262626', padding: 22, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
  welcome: { fontSize: 22, fontWeight: '900', color: '#39FF14', letterSpacing: 1, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#A0AEC0', marginTop: 4, marginBottom: 25, textAlign: 'center' },
  cardPerfilInfo: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, width: '100%', marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  linhaInfo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  txtPerfilDados: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  statusVerificacao: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, backgroundColor: '#1A1A1A', marginBottom: 20, width: '100%' },
  txtVerificacao: { fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 },
  txtLinkVerificar: { color: '#FFF', fontSize: 12, textDecorationLine: 'underline', marginTop: 4, fontWeight: 'bold' },
  botaoSair: { backgroundColor: '#FF4444', padding: 15, borderRadius: 12, width: '100%', marginTop: 5 },
  textoBotaoSair: { color: '#FFF', textAlign: 'center', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  tabBarContainer: { flexDirection: 'row', height: 60, backgroundColor: '#262626', borderWidth: 1, borderColor: '#333', marginHorizontal: 20, marginBottom: 25, borderRadius: 20, position: 'relative', bottom: 10, elevation: 8 },
  tabBotao: { flex: 1, justifyContent: 'center', alignItems: 'center', margin: 4, borderRadius: 14 },
  tabBotaoAtivo: { backgroundColor: '#39FF14' },
  tabTexto: { fontSize: 11, color: '#777', fontWeight: '700', marginTop: 2 },
  tabTextoAtivo: { color: '#000' }
});