export interface Personal {
  id: string; // UID do Firebase Auth
  nome: string;
  email: string;
}

export interface Aluno {
  id: string;
  personal_id: string;
  nome: string;
  email: string;
  status: number; // 1 para Ativo, 0 para Desativado
}

export interface FichaTreino {
  id?: number;
  aluno_id: string;
  nome_rotina: string;
  descricao: string;
  data_criacao?: string;
}

export interface MedidasAluno {
  id?: number;
  aluno_id: string;
  peso: number;
  altura: number;
  data_registro?: string;
}

export interface Checkin {
  id?: number;
  aluno_id: string;
  data_checkin?: string;
}

export interface RegistroIMC {
  id: number;
  data: string;
  peso: number;
  altura: number;
  imc: number;
}