import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { getDatabase } from '../services/database';
import { Ionicons } from '@expo/vector-icons'; 
import * as Print from 'expo-print';

interface Ficha { id: number; aluno_id: string; nome: string; }
interface Exercicio { id: number; ficha_id: number; nome: string; grupoMuscular: string; series: number; repeticoes: number; carga: number; concluido: number; }

const CATALOGO_BASE = [
  { nome: 'Supino Reto', grupo: 'Peito' }, { nome: 'Supino Inclinado', grupo: 'Peito' },
  { nome: 'Puxada Alta', grupo: 'Costas' }, { nome: 'Remada Baixa', grupo: 'Costas' },
  { nome: 'Agachamento Livre', grupo: 'Pernas' }, { nome: 'Leg Press 45°', grupo: 'Pernas' },
  { nome: 'Elevação Lateral', grupo: 'Ombros' }, { nome: 'Tríceps Corda', grupo: 'Tríceps' }
];

export default function FichaScreen({ route }: any) {
  const tipoUsuario = route.params?.tipo || 'aluno';
  const alunoId = route.params?.alunoId || route.params?.usuarioId;

  // estados locais da estrutura de rotinas
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [fichaSelecionada, setFichaSelecionada] = useState<Ficha | null>(null);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [totalCheckins, setTotalCheckins] = useState(0);
  
  // modais e estados de criação/edição do personal
  const [modalCriarFicha, setModalCriarFicha] = useState(false);
  const [nomeNovaFicha, setNomeNovaFicha] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // estados do formulário de prescrição
  const [mostrarFormExercicio, setMostrarFormExercicio] = useState(false);
  const [pesquisaExercicio, setPesquisaExercicio] = useState('');
  const [exercicioSelecionado, setExercicioSelecionado] = useState<{nome: string, grupo: string} | null>(null);
  const [seriesPrescritas, setSeriesPrescritas] = useState('');
  const [repsPrescritas, setRepsPrescritas] = useState('');

  // estados do treino em cascata do aluno
  const [treinoEmAndamento, setTreinoEmAndamento] = useState(false);
  const [tempoTreino, setTempoTreino] = useState(0);
  const [exercicioAtualIndex, setExercicioAtualIndex] = useState(0);
  const [serieAtual, setSerieAtual] = useState(1);

  // estados do cronômetro de descanso
  const [mostrarDescanso, setMostrarDescanso] = useState(false);
  const [tempoDescanso, setTempoDescanso] = useState(0);

  const intervaloTreinoRef = useRef<any>(null);
  const intervaloDescansoRef = useRef<any>(null);

  useEffect(() => {
    if (alunoId) { 
      carregarFichas(); 
      if (tipoUsuario === 'aluno') carregarCheckins(); 
    }
    return () => {
      clearInterval(intervaloTreinoRef.current);
      clearInterval(intervaloDescansoRef.current);
    };
  }, [alunoId]);

  useEffect(() => {
    if (fichaSelecionada) carregarExercicios(fichaSelecionada.id);
    else setExercicios([]);
  }, [fichaSelecionada]);

  useEffect(() => {
    if (treinoEmAndamento) {
      intervaloTreinoRef.current = setInterval(() => setTempoTreino(prev => prev + 1), 1000);
    } else {
      clearInterval(intervaloTreinoRef.current);
    }
    return () => clearInterval(intervaloTreinoRef.current);
  }, [treinoEmAndamento]);

  useEffect(() => {
    if (mostrarDescanso && tempoDescanso > 0) {
      intervaloDescansoRef.current = setInterval(() => {
        setTempoDescanso(prev => {
          if (prev <= 1) {
            clearInterval(intervaloDescansoRef.current);
            setMostrarDescanso(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervaloDescansoRef.current);
  }, [mostrarDescanso, tempoDescanso]);

  // formata os segundos 
  function formatarTempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  }

  // cancela o intervalo de descanso e fecha o modal na tela
  function pularDescanso() {
    clearInterval(intervaloDescansoRef.current);
    setMostrarDescanso(false);
    setTempoDescanso(0);
  }

  async function carregarFichas() {
    const database = await getDatabase();
    const resultado = await database.getAllAsync<Ficha>('SELECT * FROM fichas WHERE aluno_id = ?', [alunoId]);
    setFichas(resultado);
  }

  async function carregarExercicios(id: number) {
    const database = await getDatabase();
    const res = await database.getAllSync<Exercicio>('SELECT * FROM exercicios WHERE ficha_id = ?', [id]);
    setExercicios(res);
  }

  async function carregarCheckins() {
    const database = await getDatabase();
    const res: any = await database.getFirstAsync('SELECT COUNT(*) as total FROM checkins WHERE aluno_id = ?', [alunoId]);
    setTotalCheckins(res?.total || 0);
  }

  async function criarNovaFicha() {
    if (!nomeNovaFicha.trim()) return;
    const database = await getDatabase();
    await database.runAsync('INSERT INTO fichas (aluno_id, nome) VALUES (?, ?)', [alunoId, nomeNovaFicha.trim()]);
    setNomeNovaFicha('');
    setModalCriarFicha(false);
    carregarFichas();
    Alert.alert('Sucesso', 'Ficha criada! Toque nela para adicionar os exercícios.');
  }

  async function adicionarExercicio() {
    if (!fichaSelecionada || !exercicioSelecionado || !seriesPrescritas || !repsPrescritas) return;
    const database = await getDatabase();
    await database.runAsync(
      'INSERT INTO exercicios (ficha_id, nome, grupoMuscular, series, repeticoes, carga) VALUES (?, ?, ?, ?, ?, ?)',
      [fichaSelecionada.id, exercicioSelecionado.nome, exercicioSelecionado.grupo, parseInt(seriesPrescritas), parseInt(repsPrescritas), 0]
    );
    setExercicioSelecionado(null); setSeriesPrescritas(''); setRepsPrescritas(''); setMostrarFormExercicio(false);
    carregarExercicios(fichaSelecionada.id);
  }

  async function excluirExercicioIndividual(idExercicio: number, nomeExercicio: string) {
    Alert.alert('Remover Exercício', `Deseja excluir "${nomeExercicio}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const database = await getDatabase();
          await database.runAsync('DELETE FROM exercicios WHERE id = ?', [idExercicio]);
          carregarExercicios(fichaSelecionada!.id);
        }
      }
    ]);
  }

  async function excluirFichaFocada() {
    if (!fichaSelecionada) return;
    Alert.alert('Excluir Rotina', `Apagar a rotina "${fichaSelecionada.nome}" inteira?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const database = await getDatabase();
          await database.runAsync('DELETE FROM fichas WHERE id = ?', [fichaSelecionada.id]);
          setFichaSelecionada(null);
          setModoEdicao(false);
          carregarFichas();
        }
      }
    ]);
  }

  function iniciarTreino(ficha: Ficha, listaExercicios: Exercicio[]) {
    if (listaExercicios.length === 0) {
      Alert.alert('Aviso', 'Esta rotina não possui exercícios prescritos.');
      return;
    }
    setFichaSelecionada(ficha);
    setExercicios(listaExercicios);
    setTempoTreino(0);
    setExercicioAtualIndex(0);
    setSerieAtual(1);
    setTreinoEmAndamento(true);
  }

  function concluirSerie(totalSeries: number) {
    setTempoDescanso(60);
    setMostrarDescanso(true);
    if (serieAtual < totalSeries) {
      setSerieAtual(prev => prev + 1);
    } else {
      if (exercicioAtualIndex + 1 < exercicios.length) {
        setExercicioAtualIndex(prev => prev + 1);
        setSerieAtual(1);
      } else {
        setMostrarDescanso(false);
        Alert.alert('Fim do Treino!', 'Todos os exercícios concluídos! Finalize na base da tela.');
      }
    }
  }

  async function finalizarTreino() {
    const database = await getDatabase();
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const jaFez = await database.getFirstAsync('SELECT * FROM checkins WHERE data = ? AND aluno_id = ?', [dataAtual, alunoId]);
    if (!jaFez) {
      await database.runAsync('INSERT INTO checkins (aluno_id, data) VALUES (?, ?)', [alunoId, dataAtual]);
    }
    setTreinoEmAndamento(false);
    setFichaSelecionada(null);
    carregarCheckins();
    Alert.alert('Sucesso', 'Treino finalizado e check-in salvo!');
  }

  async function exportarFichaPDF() {
    if (!fichaSelecionada || exercicios.length === 0) return;
    const linhasHtml = exercicios.map(e => `
      <tr style="border-bottom: 1px solid #333;">
        <td style="padding:12px; font-weight:bold; color:#FFF;">${e.nome}</td>
        <td style="padding:12px; color:#A0AEC0;">${e.grupoMuscular}</td>
        <td style="padding:12px; text-align:center; color:#39FF14;">${e.series}</td>
        <td style="padding:12px; text-align:center; color:#FFF;">${e.repeticoes}</td>
      </tr>
    `).join('');

    const codigoHtml = `<html><body style="font-family:sans-serif; background-color:#1A1A1A; color:#FFF; padding:30px;">
      <h1 style="color:#39FF14;">FITSYNC MANAGEMENT</h1><p>Rotina: ${fichaSelecionada.nome}</p>
      <table style="width:100%; border-collapse:collapse; background-color:#262626;">
        <thead><tr style="background-color:#333;"><th style="padding:12px;color:#39FF14;">EXERCÍCIO</th><th style="padding:12px;color:#39FF14;">GRUPO</th><th style="padding:12px;text-align:center;color:#39FF14;">SÉRIES</th><th style="padding:12px;text-align:center;color:#39FF14;">REPS</th></tr></thead>
        <tbody>${linhasHtml}</tbody>
      </table></body></html>`;

    try { await Print.printAsync({ html: codigoHtml }); } catch (e) { console.error(e); }
  }

  return (
    <View style={styles.container}>
      
      {tipoUsuario === 'aluno' && !treinoEmAndamento && (
        <View style={styles.painelFrequencia}>
          <Text style={styles.txtFrequencia}>SUA CONSTÂNCIA: {totalCheckins} TREINOS CONCLUÍDOS</Text>
        </View>
      )}

      {tipoUsuario === 'personal' && !fichaSelecionada && (
        <TouchableOpacity style={styles.btnCriarFichaPrincipal} onPress={() => setModalCriarFicha(true)}>
          <Ionicons name="add-circle-outline" size={20} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.txtBtnCriarPrincipal}>CRIAR FICHA DE TREINO</Text>
        </TouchableOpacity>
      )}

      {/* visão principal: lista de cards de rotinas no mural */}
      {!fichaSelecionada && !treinoEmAndamento && (
        <FlatList 
          data={fichas}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.listaVazia}>Nenhum treino criado para este aluno.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.cardFichaMural} onPress={() => setFichaSelecionada(item)}>
              <View style={styles.headCardMural}>
                <Text style={styles.tituloCardMural}>{item.nome.toUpperCase()}</Text>
                <Ionicons name="chevron-forward" size={18} color="#39FF14" />
              </View>
              <Text style={styles.subtxtCardMural}>Toque para gerenciar ou visualizar exercícios</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {fichaSelecionada && !treinoEmAndamento && (
        <View style={{ flex: 1 }}>
          
          <View style={styles.headerGerenciamentoCard}>
            <TouchableOpacity style={styles.btnVoltarMural} onPress={() => { setFichaSelecionada(null); setModoEdicao(false); }}>
              <Ionicons name="arrow-back" size={20} color="#39FF14" />
              <Text style={styles.txtVoltarMural}>MURAL</Text>
            </TouchableOpacity>
            <Text style={styles.txtNomeFichaAtiva}>{fichaSelecionada.nome.toUpperCase()}</Text>
          </View>

          {/* menu de ações do personal dentro do card */}
          {tipoUsuario === 'personal' && (
            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
              {!modoEdicao ? (
                <>
                  <TouchableOpacity style={[styles.btnAcaoCard, { backgroundColor: '#39FF14', flex: 1, marginRight: 8 }]} onPress={() => setModoEdicao(true)}>
                    <Ionicons name="create-outline" size={16} color="#000" style={{ marginRight: 4 }} />
                    <Text style={styles.txtBtnAcaoCard}>EDITAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnAcaoCard, { backgroundColor: '#39FF14', width: 90 }]} onPress={exportarFichaPDF}>
                    <Ionicons name="document-text-outline" size={16} color="#000" style={{ marginRight: 4 }} />
                    <Text style={styles.txtBtnAcaoCard}>PDF</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ flexDirection: 'row', flex: 1 }}>
                  <TouchableOpacity style={[styles.btnAcaoCard, { backgroundColor: '#39FF14', flex: 1, marginRight: 8 }]} onPress={() => setModoEdicao(false)}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#000" style={{ marginRight: 4 }} />
                    <Text style={styles.txtBtnAcaoCard}>SALVAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnAcaoCard, { backgroundColor: '#FF4444', flex: 0.8 }]} onPress={excluirFichaFocada}>
                    <Ionicons name="trash-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={[styles.txtBtnAcaoCard, { color: '#FFF' }]}>EXCLUIR</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {tipoUsuario === 'personal' && modoEdicao && !mostrarFormExercicio && (
            <TouchableOpacity style={styles.btnPrescreverExercicioRapido} onPress={() => setMostrarFormExercicio(true)}>
              <Ionicons name="add-outline" size={16} color="#39FF14" style={{ marginRight: 4 }} />
              <Text style={styles.txtBtnPrescreverExercicioRapido}>ADICIONAR EXERCÍCIO</Text>
            </TouchableOpacity>
          )}

          {mostrarFormExercicio && (
            <View style={styles.formularioExercicio}>
              {!exercicioSelecionado ? (
                <View>
                  <TextInput style={styles.inputForm} placeholder="Filtrar catálogo..." placeholderTextColor="#666" value={pesquisaExercicio} onChangeText={setPesquisaExercicio} />
                  <ScrollView style={{ height: 90 }} nestedScrollEnabled>
                    {CATALOGO_BASE.filter(i => i.nome.toLowerCase().includes(pesquisaExercicio.toLowerCase())).map((item, index) => (
                      <TouchableOpacity key={index} style={styles.itemCatalogo} onPress={() => setExercicioSelecionado({nome: item.nome, grupo: item.grupo})}>
                        <Text style={{ color: '#FFF' }}>{item.nome}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View>
                  <Text style={{ color: '#39FF14', fontWeight: 'bold', marginBottom: 10 }}>{exercicioSelecionado.nome}</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                    <TextInput style={[styles.inputForm, { flex: 1, marginRight: 8 }]} placeholder="Séries" placeholderTextColor="#666" keyboardType="numeric" value={seriesPrescritas} onChangeText={setSeriesPrescritas} />
                    <TextInput style={[styles.inputForm, { flex: 1 }]} placeholder="Repetições" placeholderTextColor="#666" keyboardType="numeric" value={repsPrescritas} onChangeText={setRepsPrescritas} />
                  </View>
                  <TouchableOpacity style={styles.botaoSalvarExercicio} onPress={adicionarExercicio}>
                    <Text style={{ color: '#000', fontWeight: 'bold' }}>INSERIR NA ROTINA</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <FlatList 
            data={exercicios}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={<Text style={styles.listaVazia}>Nenhum exercício neste card.</Text>}
            renderItem={({ item }) => (
              <View style={styles.cardExercicioItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nomeExercicio}>{item.nome}</Text>
                  <Text style={styles.detalhesExercicio}>{item.grupoMuscular} • {item.series}x de {item.repeticoes} Repetições</Text>
                </View>
                {tipoUsuario === 'personal' && modoEdicao && (
                  <TouchableOpacity style={styles.btnLixeiraIndividual} onPress={() => excluirExercicioIndividual(item.id, item.nome)}>
                    <Ionicons name="trash-outline" size={18} color="#FF4444" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />

          {tipoUsuario === 'aluno' && (
            <TouchableOpacity style={styles.btnIniciarTreinoCardBase} onPress={() => iniciarTreino(fichaSelecionada, exercicios)}>
              <Ionicons name="play-outline" size={18} color="#000" style={{ marginRight: 6 }} />
              <Text style={styles.txtBtnIniciarTreinoCardBase}>INICIAR ESTE TREINO</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {treinoEmAndamento && (
        <View style={{ flex: 1 }}>
          <View style={styles.painelCronometroFixo}>
            <Text style={styles.txtCronometroAtivo}>TEMPO DE TREINO: {formatarTempo(tempoTreino)}</Text>
          </View>

          <FlatList 
            data={exercicios}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 80 }}
            renderItem={({ item, index }) => {
              const isFoco = index === exercicioAtualIndex;
              const isPassou = index < exercicioAtualIndex;

              return (
                <View style={[styles.card, isFoco && styles.cardEmFoco, isPassou && { opacity: 0.3 }]}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nomeExercicio}>{item.nome}</Text>
                      <Text style={styles.detalhesExercicio}>{item.grupoMuscular} • {item.series}x{item.repeticoes}</Text>
                      
                      {isFoco && (
                        <View style={styles.areaExecucaoSerie}>
                          <Text style={styles.txtSerieFoco}>SÉRIE ATUAL: {serieAtual} / {item.series}</Text>
                          <TouchableOpacity style={styles.btnConcluirSerie} onPress={() => concluirSerie(item.series)}>
                            <Ionicons name="checkmark-outline" size={14} color="#000" style={{ marginRight: 4 }} />
                            <Text style={styles.txtBtnConcluir}>CONCLUIR SÉRIE {serieAtual}</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {isPassou && <Ionicons name="checkmark-circle" size={22} color="#39FF14" />}
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.painelAcaoInferiorFixo}>
            <TouchableOpacity style={styles.btnFinalizarTreinoBase} onPress={finalizarTreino}>
              <Text style={styles.txtBtnFinalizarBase}>ENCERRAR E REGISTRAR CHECK-IN</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal transparent visible={modalCriarFicha} animationType="slide">
        <View style={styles.fundoModal}>
          <View style={styles.cardModal}>
            <Text style={styles.tituloModal}>CRIAR NOVA FICHA DE TREINO</Text>
            <TextInput style={styles.inputForm} placeholder="Nome da Ficha (Ex: Treino A)" placeholderTextColor="#666" value={nomeNovaFicha} onChangeText={setNomeNovaFicha} />
            
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={[styles.btnModalAcao, { backgroundColor: '#39FF14', flex: 1, marginRight: 8 }]} onPress={criarNovaFicha}>
                <Text style={styles.txtBtnModalAcao}>SALVAR CARD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnModalAcao, { backgroundColor: '#444', width: 100 }]} onPress={() => { setModalCriarFicha(false); setNomeNovaFicha(''); }}>
                <Text style={[styles.txtBtnModalAcao, { color: '#FFF' }]}>VOLTAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={mostrarDescanso} animationType="fade">
        <View style={styles.fundoModalDescanso}>
          <View style={styles.cardModalDescanso}>
            <Ionicons name="hourglass-outline" size={36} color="#39FF14" />
            <Text style={styles.tituloModalDescanso}>DESCANSO ENTRE SÉRIES</Text>
            <Text style={styles.cronometroDescanso}>{tempoDescanso}s</Text>
            <TouchableOpacity style={styles.btnPularDescanso} onPress={pularDescanso}>
              <Ionicons name="play-forward-outline" size={16} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.txtBtnPular}>PULAR DESCANSO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#1A1A1A' },
  painelFrequencia: { backgroundColor: '#262626', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  txtFrequencia: { fontSize: 11, fontWeight: '900', color: '#A0AEC0', textAlign: 'center', letterSpacing: 0.5 },
  
  btnCriarFichaPrincipal: { backgroundColor: '#39FF14', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  txtBtnCriarPrincipal: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },
  
  cardFichaMural: { backgroundColor: '#262626', padding: 18, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  headCardMural: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloCardMural: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  subtxtCardMural: { color: '#777', fontSize: 11, marginTop: 4, fontWeight: 'bold' },

  headerGerenciamentoCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, backgroundColor: '#262626', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  btnVoltarMural: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 15 },
  txtVoltarMural: { color: '#39FF14', fontSize: 11, fontWeight: '900', marginLeft: 4 },
  txtNomeFichaAtiva: { color: '#FFF', fontSize: 14, fontWeight: '900', flex: 1, letterSpacing: 0.5 },

  btnAcaoCard: { height: 40, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  txtBtnAcaoCard: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  btnPrescreverExercicioRapido: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#39FF14', alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'center' },
  txtBtnPrescreverExercicioRapido: { color: '#39FF14', fontSize: 12, fontWeight: 'bold' },

  formularioExercicio: { backgroundColor: '#262626', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 15 },
  inputForm: { backgroundColor: '#1A1A1A', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333', color: '#FFF', width: '100%' },
  itemCatalogo: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  botaoSalvarExercicio: { backgroundColor: '#39FF14', padding: 12, borderRadius: 8, alignItems: 'center' },
  listaVazia: { textAlign: 'center', color: '#555', marginTop: 30, fontSize: 13, fontWeight: 'bold' },
  
  cardExercicioItem: { backgroundColor: '#262626', padding: 15, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  btnLixeiraIndividual: { paddingLeft: 15, paddingVertical: 5 },
  btnIniciarTreinoCardBase: { backgroundColor: '#39FF14', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  txtBtnIniciarTreinoCardBase: { color: '#000', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 },

  painelCronometroFixo: { backgroundColor: '#262626', padding: 12, borderRadius: 10, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  txtCronometroAtivo: { color: '#39FF14', fontSize: 13, fontWeight: '900' },
  card: { backgroundColor: '#262626', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  cardEmFoco: { borderColor: '#39FF14', borderWidth: 1.5, backgroundColor: '#1E2A18' },
  nomeExercicio: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
  detalhesExercicio: { fontSize: 12, color: '#A0AEC0', marginTop: 3 },
  areaExecucaoSerie: { marginTop: 10, backgroundColor: '#1A1A1A', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  txtSerieFoco: { color: '#39FF14', fontSize: 11, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  btnConcluirSerie: { backgroundColor: '#39FF14', padding: 10, borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  txtBtnConcluir: { color: '#000', fontSize: 11, fontWeight: '900' },
  painelAcaoInferiorFixo: { position: 'absolute', bottom: 15, left: 15, right: 15, backgroundColor: '#262626', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#333' },
  btnFinalizarTreinoBase: { backgroundColor: '#FF4444', padding: 12, borderRadius: 10, alignItems: 'center' },
  txtBtnFinalizarBase: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  cardModal: { backgroundColor: '#262626', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  tituloModal: { color: '#39FF14', fontSize: 13, fontWeight: '900', marginBottom: 15, letterSpacing: 0.5 },
  btnModalAcao: { height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  txtBtnModalAcao: { color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
  fundoModalDescanso: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  cardModalDescanso: { backgroundColor: '#262626', padding: 25, borderRadius: 16, alignItems: 'center', width: '80%', borderWidth: 1, borderColor: '#333' },
  tituloModalDescanso: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  cronometroDescanso: { color: '#39FF14', fontSize: 44, fontWeight: '900', marginVertical: 10 },
  btnPularDescanso: { backgroundColor: '#39FF14', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  txtBtnPular: { color: '#000', fontWeight: '900', fontSize: 12 }
});