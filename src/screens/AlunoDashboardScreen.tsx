import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, ActivityIndicator, FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../services/database';
import { auth } from '../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  monthNamesShort: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  dayNames: ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],
  dayNamesShort: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  today: 'Hoje'
};
LocaleConfig.defaultLocale = 'pt-br';

interface Ficha {
  id: number;
  aluno_id: string;
  nome: string;
}

interface HistoricoIMC {
  id: number;
  peso: number;
  altura: number;
  imc: number;
  data: string;
}

export default function AlunoDashboardScreen({ route, navigation }: any) {
  const usuarioId = route.params?.usuarioId;
  const nomeAluno = route.params?.nome || 'Atleta';

  const [loading, setLoading] = useState(false);
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [historico, setHistorico] = useState<HistoricoIMC[]>([]);
  const [datasMarcadas, setDatasMarcadas] = useState<any>({});
  
  const [abaAtiva, setAbaAtiva] = useState<'inicio' | 'treinos' | 'evolucao' | 'perfil'>('inicio');

  const [pesoInput, setPesoInput] = useState('');
  const [alturaInput, setAlturaInput] = useState('');
  const [mostrarFormMedidas, setMostrarFormMedidas] = useState(false);

  useEffect(() => {
    if (usuarioId) {
      if (abaAtiva === 'inicio') {
        carregarHistoricoCheckins();
      } else if (abaAtiva === 'treinos') {
        carregarFichasDireto();
      } else if (abaAtiva === 'evolucao') {
        carregarHistoricoMedidas();
      }
    }
  }, [usuarioId, abaAtiva]);

  async function carregarHistoricoCheckins() {
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<{ data: string }>(
        'SELECT data FROM checkins WHERE aluno_id = ?',
        [usuarioId]
      );

      const marcacoes: any = {};
      resultado.forEach((item: any) => {
        const partes = item.data.split('/');
        if (partes.length === 3) {
          const dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
          marcacoes[dataFormatada] = {
            selected: true,
            selectedColor: '#39FF14',
            textColor: '#000'
          };
        }
      });
      setDatasMarcadas(marcacoes);
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarFichasDireto() {
    setLoading(true);
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<Ficha>(
        'SELECT id, aluno_id, nome FROM fichas WHERE aluno_id = ?',
        [usuarioId]
      );
      setFichas(resultado);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function carregarHistoricoMedidas() {
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<HistoricoIMC>(
        'SELECT * FROM historico_imc WHERE aluno_id = ? ORDER BY id DESC',
        [usuarioId]
      );
      setHistorico(resultado);
      if (resultado.length > 0 && !alturaInput) {
        setAlturaInput(resultado[0].altura.toString());
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSalvarMedidas() {
    const peso = parseFloat(pesoInput.replace(',', '.'));
    const altura = parseFloat(alturaInput.replace(',', '.'));

    if (!peso || !altura || peso <= 0 || altura <= 0) {
      Alert.alert('Erro', 'Insira valores validos para peso e altura.');
      return;
    }

    setLoading(true);
    try {
      const imcCalculado = peso / (altura * altura);
      const dataAtual = new Date().toLocaleDateString('pt-BR');

      const database = await getDatabase();
      await database.runAsync(
        'INSERT INTO historico_imc (aluno_id, peso, altura, imc, data) VALUES (?, ?, ?, ?, ?)',
        [usuarioId, peso, altura, imcCalculado, dataAtual]
      );

      Alert.alert('Sucesso', 'Medidas registradas com sucesso!');
      setPesoInput('');
      setMostrarFormMedidas(false);
      carregarHistoricoMedidas();
    } catch (e) {
      Alert.alert('Erro', 'Nao foi possivel salvar os dados.');
    } finally {
      setLoading(false);
    }
  }

  function obterClassificacaoIMC(imc: number): string {
    if (imc < 18.5) return 'Abaixo do Peso';
    if (imc < 25) return 'Peso Normal';
    if (imc < 30) return 'Sobrepeso';
    if (imc < 35) return 'Obesidade I';
    if (imc < 40) return 'Obesidade II';
    return 'Obesidade III';
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (e) {
      Alert.alert('Erro', 'Nao foi possivel desconectar.');
    }
  }

  const ultimoRegistro = historico[0] || null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        
        {abaAtiva === 'inicio' && (
          <View style={{ width: '100%' }}>
            <View style={styles.boasVindasContainer}>
              <Text style={styles.txtSaudacao}>Ola, {nomeAluno}</Text>
              <Text style={styles.txtSubSaudacao}>Gerencie sua constancia e frequencia</Text>
            </View>

            <Text style={styles.tituloSecao}>CALENDÁRIO DE CONSISTÊNCIA</Text>
            <View style={styles.calendarioContainer}>
              <Calendar
                theme={{
                  backgroundColor: '#1A1A1A',
                  calendarBackground: '#1A1A1A',
                  textSectionTitleColor: '#A0AEC0',
                  selectedDayBackgroundColor: '#39FF14',
                  selectedDayTextColor: '#000',
                  todayTextColor: '#39FF14',
                  dayTextColor: '#FFF',
                  textDisabledColor: '#444',
                  monthTextColor: '#39FF14',
                  arrowColor: '#39FF14',
                  textDayFontWeight: 'bold',
                  textMonthFontWeight: '900',
                  textDayHeaderFontWeight: 'bold',
                }}
                markedDates={datasMarcadas}
              />
            </View>
          </View>
        )}

        {abaAtiva === 'treinos' && (
          <View style={{ width: '100%' }}>
            <Text style={styles.tituloSecao}>SUAS ROTINAS DE TREINO</Text>
            
            {loading ? (
              <ActivityIndicator size="small" color="#39FF14" style={{ marginTop: 20 }} />
            ) : (
              <FlatList 
                data={fichas}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false} // evita conflito de scroll com o scrollview pai
                ListEmptyComponent={<Text style={styles.listaVazia}>Nenhuma rotina de treino prescrita para voce.</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.cardTreinoDireto}
                    onPress={() => navigation.navigate('Ficha', { tipo: 'aluno', usuarioId, FichaInicialId: item.id })}
                  >
                    <View style={styles.linhaTreinoDireto}>
                      <View style={styles.containerTextoTreino}>
                        <Text style={styles.txtNomeTreinoDireto}>{item.nome.toUpperCase()}</Text>
                        <Text style={styles.txtSubTreinoDireto}>Toque para abrir e visualizar o treino</Text>
                      </View>
                      <Ionicons name="play-circle-outline" size={24} color="#39FF14" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {abaAtiva === 'evolucao' && (
          <View style={{ width: '100%' }}>
            <Text style={styles.tituloSecao}>EVOLUÇÃO CORPORAL E IMC</Text>
            
            {ultimoRegistro ? (
              <View style={styles.cardImcStatus}>
                <View style={styles.linhaImcDados}>
                  <View style={styles.blocoMetrica}>
                    <Text style={styles.txtMetricaLabel}>PESO</Text>
                    <Text style={styles.txtMetricaValor}>{ultimoRegistro.peso} kg</Text>
                  </View>
                  <View style={styles.blocoMetrica}>
                    <Text style={styles.txtMetricaLabel}>IMC ATUAL</Text>
                    <Text style={[styles.txtMetricaValor, { color: '#39FF14' }]}>
                      {ultimoRegistro.imc.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.txtClassificacaoImc}>
                  Classificacao: {obterClassificacaoIMC(ultimoRegistro.imc)}
                </Text>
                <Text style={styles.txtDataRegistro}>Ultima atualizacao em {ultimoRegistro.data}</Text>
              </View>
            ) : (
              <View style={styles.cardImcVazio}>
                <Text style={styles.txtImcVazio}>Nenhuma medida corporal registrada ate o momento.</Text>
              </View>
            )}

            {!mostrarFormMedidas ? (
              <TouchableOpacity style={styles.btnRegistrarMedidas} onPress={() => setMostrarFormMedidas(true)}>
                <Ionicons name="add-outline" size={16} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.txtBtnRegistrarMedidas}>REGISTRAR NOVAS MEDIDAS</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.formularioMedidas}>
                <Text style={styles.tituloFormMedidas}>ATUALIZAR DADOS FÍSICOS</Text>
                <TextInput style={styles.inputForm} placeholder="Peso Atual (kg)" placeholderTextColor="#666" keyboardType="numeric" value={pesoInput} onChangeText={setPesoInput} />
                <TextInput style={styles.inputForm} placeholder="Altura (m)" placeholderTextColor="#666" keyboardType="numeric" value={alturaInput} onChangeText={setAlturaInput} />

                <View style={{ flexDirection: 'row', marginTop: 5 }}>
                  <TouchableOpacity style={[styles.btnFormMedidas, { backgroundColor: '#39FF14', flex: 1, marginRight: 8 }]} onPress={handleSalvarMedidas} disabled={loading}>
                    <Text style={styles.txtBtnFormMedidas}>SALVAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnFormMedidas, { backgroundColor: '#444', width: 90 }]} onPress={() => { setMostrarFormMedidas(false); setPesoInput(''); }}>
                    <Text style={[styles.txtBtnFormMedidas, { color: '#FFF' }]}>CANCELAR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={[styles.tituloSecao, { marginTop: 25 }]}>TABELA DE PARÂMETROS IMC</Text>
            <View style={styles.containerTabelaImc}>
              <View style={styles.linhaTabelaHeader}>
                <Text style={[styles.txtCelularHeader, { flex: 1.2 }]}>INTERVALO IMC</Text>
                <Text style={[styles.txtCelularHeader, { flex: 1.8 }]}>CLASSIFICAÇÃO</Text>
              </View>
              <View style={styles.linhaTabelaCorpo}>
                <Text style={[styles.txtCelularCorpo, { flex: 1.2 }]}>Menor que 18.5</Text>
                <Text style={[styles.txtCelularCorpo, { flex: 1.8, color: '#A0AEC0' }]}>Abaixo do peso</Text>
              </View>
              <View style={styles.linhaTabelaCorpo}>
                <Text style={[styles.txtCelularCorpo, { flex: 1.2 }]}>18.5 a 24.9</Text>
                <Text style={[styles.txtCelularCorpo, { flex: 1.8, color: '#39FF14', fontWeight: '900' }]}>Peso normal</Text>
              </View>
              <View style={styles.linhaTabelaCorpo}>
                <Text style={[styles.txtCelularCorpo, { flex: 1.2 }]}>25.0 a 29.9</Text>
                <Text style={[styles.txtCelularCorpo, { flex: 1.8, color: '#FFCC00' }]}>Sobrepeso</Text>
              </View>
              <View style={styles.linhaTabelaCorpo}>
                <Text style={[styles.txtCelularCorpo, { flex: 1.2 }]}>30.0 a 34.9</Text>
                <Text style={[styles.txtCelularCorpo, { flex: 1.8, color: '#FF8800' }]}>Obesidade grau I</Text>
              </View>
              <View style={styles.linhaTabelaCorpo}>
                <Text style={[styles.txtCelularCorpo, { flex: 1.2 }]}>35.0 a 39.9</Text>
                <Text style={[styles.txtCelularCorpo, { flex: 1.8, color: '#FF4444' }]}>Obesidade grau II</Text>
              </View>
              <View style={[styles.linhaTabelaCorpo, { borderBottomWidth: 0 }]}>
                <Text style={[styles.txtCelularCorpo, { flex: 1.2 }]}>Maior que 40.0</Text>
                <Text style={[styles.txtCelularCorpo, { flex: 1.8, color: '#FF0000', fontWeight: 'bold' }]}>Obesidade grau III</Text>
              </View>
            </View>
          </View>
        )}

        {abaAtiva === 'perfil' && (
          <View style={styles.containerPerfil}>
            <View style={styles.cardPerfilCentral}>
              <Text style={styles.tituloPerfil}>SUA CONTA</Text>
              <View style={styles.blocoInfoPerfil}>
                <View style={styles.linhaPerfilInfo}>
                  <Ionicons name="person-outline" size={18} color="#39FF14" style={{ marginRight: 10 }} />
                  <Text style={styles.txtPerfilInfo}>{nomeAluno}</Text>
                </View>
                <View style={styles.linhaPerfilInfo}>
                  <Ionicons name="mail-outline" size={18} color="#39FF14" style={{ marginRight: 10 }} />
                  <Text style={styles.txtPerfilInfo}>{auth.currentUser?.email || 'Acesso Local'}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.btnDesconectar} onPress={handleLogout}>
                <Text style={styles.txtBtnDesconectar}>LOGOUT DA CONTA</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </ScrollView>

      <View style={styles.tabBarContainer}>
        <TouchableOpacity style={[styles.tabBotao, abaAtiva === 'inicio' && styles.tabBotaoAtivo]} onPress={() => setAbaAtiva('inicio')}>
          <Ionicons name="home-outline" size={20} color={abaAtiva === 'inicio' ? '#000' : '#777'} />
          <Text style={[styles.tabTexto, abaAtiva === 'inicio' && styles.tabTextoAtivo]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBotao, abaAtiva === 'treinos' && styles.tabBotaoAtivo]} onPress={() => setAbaAtiva('treinos')}>
          <Ionicons name="barbell-outline" size={20} color={abaAtiva === 'treinos' ? '#000' : '#777'} />
          <Text style={[styles.tabTexto, abaAtiva === 'treinos' && styles.tabTextoAtivo]}>Treinos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBotao, abaAtiva === 'evolucao' && styles.tabBotaoAtivo]} onPress={() => setAbaAtiva('evolucao')}>
          <Ionicons name="trending-up-outline" size={20} color={abaAtiva === 'evolucao' ? '#000' : '#777'} />
          <Text style={[styles.tabTexto, abaAtiva === 'evolucao' && styles.tabTextoAtivo]}>Evolucao</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tabBotao, abaAtiva === 'perfil' && styles.tabBotaoAtivo]} onPress={() => setAbaAtiva('perfil')}>
          <Ionicons name="person-outline" size={20} color={abaAtiva === 'perfil' ? '#000' : '#777'} />
          <Text style={[styles.tabTexto, abaAtiva === 'perfil' && styles.tabTextoAtivo]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  scrollContainer: { padding: 15, paddingBottom: 100, alignItems: 'center' },
  boasVindasContainer: { width: '100%', marginBottom: 20, marginTop: 10 },
  txtSaudacao: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
  txtSubSaudacao: { fontSize: 13, color: '#777', marginTop: 4, fontWeight: 'bold' },
  tituloSecao: { fontSize: 11, fontWeight: '900', color: '#39FF14', alignSelf: 'flex-start', marginBottom: 12, marginTop: 10, letterSpacing: 1 },
  listaVazia: { textAlign: 'center', color: '#555', marginTop: 30, fontSize: 13, fontWeight: 'bold' },
  
  calendarioContainer: { backgroundColor: '#262626', borderRadius: 14, padding: 8, borderWidth: 1, borderColor: '#333', overflow: 'hidden', width: '100%' },

  cardTreinoDireto: { backgroundColor: '#262626', width: '100%', padding: 18, borderRadius: 14, borderWidth: 1, borderColor: '#333', marginBottom: 10 },
  linhaTreinoDireto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  containerTextoTreino: { flex: 1, paddingRight: 10 },
  txtNomeTreinoDireto: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  txtSubTreinoDireto: { color: '#777', fontSize: 11, marginTop: 4, fontWeight: 'bold' },

  cardImcStatus: { backgroundColor: '#262626', width: '100%', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#333', marginBottom: 12 },
  linhaImcDados: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', paddingBottom: 12 },
  blocoMetrica: { alignItems: 'center' },
  txtMetricaLabel: { fontSize: 10, fontWeight: '900', color: '#777', letterSpacing: 0.5 },
  txtMetricaValor: { fontSize: 18, fontWeight: '900', color: '#FFF', marginTop: 4 },
  txtClassificacaoImc: { color: '#FFF', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  txtDataRegistro: { color: '#555', fontSize: 10, textAlign: 'center', marginTop: 6, fontWeight: 'bold' },
  cardImcVazio: { backgroundColor: '#262626', width: '100%', padding: 20, borderRadius: 14, borderWidth: 1, borderColor: '#333', marginBottom: 12, alignItems: 'center' },
  txtImcVazio: { color: '#555', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  btnRegistrarMedidas: { backgroundColor: '#39FF14', width: '100%', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  txtBtnRegistrarMedidas: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  formularioMedidas: { backgroundColor: '#262626', width: '100%', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333' },
  tituloFormMedidas: { color: '#FFF', fontSize: 12, fontWeight: '900', marginBottom: 12, textAlign: 'center', letterSpacing: 0.5 },
  inputForm: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333', color: '#FFF', fontSize: 13 },
  btnFormMedidas: { height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txtBtnFormMedidas: { color: '#000', fontWeight: '900', fontSize: 12 },

  containerTabelaImc: { backgroundColor: '#262626', width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#333', overflow: 'hidden' },
  linhaTabelaHeader: { flexDirection: 'row', backgroundColor: '#333', padding: 10 },
  txtCelularHeader: { color: '#39FF14', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  linhaTabelaCorpo: { flexDirection: 'row', padding: 11, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', alignItems: 'center' },
  txtCelularCorpo: { color: '#FFF', fontSize: 12, fontWeight: '500' },

  containerPerfil: { width: '100%', marginTop: 10 },
  cardPerfilCentral: { backgroundColor: '#262626', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  tituloPerfil: { fontSize: 16, fontWeight: '900', color: '#39FF14', letterSpacing: 0.5, marginBottom: 15 },
  blocoInfoPerfil: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  linhaPerfilInfo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  txtPerfilInfo: { color: '#FFF', fontSize: 13, fontWeight: '500' },
  btnDesconectar: { backgroundColor: '#FF4444', padding: 14, borderRadius: 10, width: '100%' },
  txtBtnDesconectar: { color: '#FFF', fontWeight: '900', fontSize: 12, textAlign: 'center', letterSpacing: 0.5 },

  tabBarContainer: { flexDirection: 'row', height: 60, backgroundColor: '#262626', borderWidth: 1, borderColor: '#333', marginHorizontal: 15, borderRadius: 20, position: 'absolute', bottom: 15, left: 0, right: 0, elevation: 8 },
  tabBotao: { flex: 1, justifyContent: 'center', alignItems: 'center', margin: 4, borderRadius: 14 },
  tabBotaoAtivo: { backgroundColor: '#39FF14' },
  tabTexto: { fontSize: 10, color: '#777', fontWeight: '700', marginTop: 2 },
  tabTextoAtivo: { color: '#000' }
});