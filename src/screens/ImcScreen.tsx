import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../services/database';

export function obterClassificacaoIMC(imc: number): string {
  if (imc < 18.5) return 'Abaixo do Peso';
  if (imc < 25) return 'Peso Normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade I';
  if (imc < 40) return 'Obesidade II';
  return 'Obesidade III';
}

export default function ImcScreen({ route }: any) {
  const alunoId = route.params?.usuarioId;

  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [historico, setHistorico] = useState<any[]>([]);

  useEffect(() => {
    if (alunoId) {
      carregarHistorico();
    }
  }, [alunoId]);

  async function carregarHistorico() {
    try {
      const database = await getDatabase();
      const resultado = await database.getAllAsync<any>(
        'SELECT * FROM historico_imc WHERE aluno_id = ? ORDER BY id DESC',
        [alunoId]
      );
      setHistorico(resultado || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  }

  async function calcularESalvar() {
    const stringPeso = peso.replace(',', '.').trim();
    const stringAltura = altura.replace(',', '.').trim();

    const vPeso = parseFloat(stringPeso);
    const vAltura = parseFloat(stringAltura);

    if (isNaN(vPeso) || isNaN(vAltura) || vPeso <= 0 || vAltura <= 0) {
      Alert.alert('Erro', 'Por favor, forneça valores válidos de peso e altura.');
      return;
    }

    const imcCalculado = vPeso / (vAltura * vAltura);
    const imcFinal = parseFloat(imcCalculado.toFixed(2));
    const classificacao = obterClassificacaoIMC(imcFinal);
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    try {
      const database = await getDatabase();
      await database.runAsync(
        'INSERT INTO historico_imc (aluno_id, data, peso, altura, imc) VALUES (?, ?, ?, ?, ?)',
        [alunoId, dataAtual, vPeso, vAltura, imcFinal]
      );

      Alert.alert('Resultado', `Seu IMC é: ${imcFinal}\nClassificação: ${classificacao}`);
      setPeso('');
      setAltura('');
      

      await carregarHistorico();
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Não foi possível salvar o IMC no banco de dados.');
    }
  }

  const renderHeader = () => (
    <View>
      <Text style={styles.label}>Peso Corporal (kg):</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Ex: 70.4" 
        placeholderTextColor="#666" 
        keyboardType="numeric" 
        value={peso} 
        onChangeText={setPeso} 
      />

      <Text style={styles.label}>Altura (m):</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Ex: 1.75" 
        placeholderTextColor="#666" 
        keyboardType="numeric" 
        value={altura} 
        onChangeText={setAltura} 
      />

      <TouchableOpacity style={styles.btn} onPress={calcularESalvar}>
        <Text style={styles.btnTexto}>CALCULAR E SALVAR</Text>
      </TouchableOpacity>

      <View style={styles.tabelaContainer}>
        <Text style={styles.tituloTabela}>ENTENDA O SEU RESULTADO</Text>
        
        <View style={styles.linhaTabela}>
          <Text style={styles.colunaImc}>Menor que 18.5</Text>
          <Text style={[styles.colunaStatus, { color: '#33B5E5' }]}>Abaixo do Peso</Text>
        </View>
        <View style={styles.linhaTabela}>
          <Text style={styles.colunaImc}>18.5 até 24.9</Text>
          <Text style={[styles.colunaStatus, { color: '#39FF14' }]}>Peso Normal</Text>
        </View>
        <View style={styles.linhaTabela}>
          <Text style={styles.colunaImc}>25.0 até 29.9</Text>
          <Text style={[styles.colunaStatus, { color: '#FFCC00' }]}>Sobrepeso</Text>
        </View>
        <View style={styles.linhaTabela}>
          <Text style={styles.colunaImc}>30.0 até 34.9</Text>
          <Text style={[styles.colunaStatus, { color: '#FF8800' }]}>Obesidade Grau I</Text>
        </View>
        <View style={styles.linhaTabela}>
          <Text style={styles.colunaImc}>35.0 ou mais</Text>
          <Text style={[styles.colunaStatus, { color: '#FF4444' }]}>Obesidade Severa</Text>
        </View>
      </View>

      <View style={styles.linhaTituloSecao}>
        <Ionicons name="stats-chart-outline" size={18} color="#39FF14" style={{ marginRight: 6 }} />
        <Text style={styles.tituloSecao}>HISTÓRICO DE EVOLUÇÃO</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={historico}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <View style={styles.itemHistorico}>
            <View style={{ flex: 1 }}>
              <Text style={styles.txtData}>{item.data}</Text>
              <Text style={styles.txtDados}>P: {item.peso}kg | A: {item.altura}m</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.txtImc}>IMC: {Number(item.imc).toFixed(2)}</Text>
              <Text style={styles.txtClassifHistorico}>{obterClassificacaoIMC(Number(item.imc))}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#666', textAlign: 'center', marginTop: 10 }}>Nenhum registro encontrado.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#1A1A1A' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#A0AEC0', marginBottom: 5, letterSpacing: 0.5 },
  input: { backgroundColor: '#262626', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#333', color: '#FFF', fontSize: 15 },
  btn: { backgroundColor: '#39FF14', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  btnTexto: { color: '#000', fontWeight: '900', fontSize: 15, letterSpacing: 1 },
  
  tabelaContainer: { backgroundColor: '#262626', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', marginBottom: 20 },
  tituloTabela: { fontSize: 11, fontWeight: '900', color: '#39FF14', marginBottom: 10, letterSpacing: 0.5, textAlign: 'center' },
  linhaTabela: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  colunaImc: { fontSize: 12, color: '#A0AEC0', fontWeight: 'bold' },
  colunaStatus: { fontSize: 12, fontWeight: 'bold' },

  linhaTituloSecao: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 10 },
  tituloSecao: { fontSize: 14, fontWeight: '900', color: '#39FF14', letterSpacing: 0.5 },
  itemHistorico: { backgroundColor: '#262626', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#333', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txtData: { fontSize: 13, color: '#A0AEC0', fontWeight: 'bold' },
  txtDados: { fontSize: 13, color: '#FFF', marginTop: 2 },
  txtImc: { fontSize: 14, color: '#39FF14', fontWeight: 'bold' },
  txtClassifHistorico: { fontSize: 10, color: '#777', fontWeight: 'bold', marginTop: 2 }
});