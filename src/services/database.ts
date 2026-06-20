// src/services/database.ts
import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  // mude de 'fitsync_local.db' para:
dbInstance = await SQLite.openDatabaseAsync('fitsync_cascata.db');

  await dbInstance.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS personais (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      nome TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alunos (
      id TEXT PRIMARY KEY,
      personal_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      data_nascimento TEXT,
      objetivo TEXT,
      historico_lesao TEXT,
      status INTEGER DEFAULT 1,
      FOREIGN KEY (personal_id) REFERENCES personais (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fichas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id TEXT NOT NULL,
      nome TEXT NOT NULL,
      FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ficha_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      grupoMuscular TEXT NOT NULL,
      series INTEGER NOT NULL,
      repeticoes INTEGER NOT NULL,
      carga REAL NOT NULL,
      concluido INTEGER DEFAULT 0,
      FOREIGN KEY (ficha_id) REFERENCES fichas (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS historico_imc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id TEXT NOT NULL,
      data TEXT NOT NULL,
      peso REAL NOT NULL,
      altura REAL NOT NULL,
      imc REAL NOT NULL,
      FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id TEXT NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (aluno_id) REFERENCES alunos (id) ON DELETE CASCADE
    );
  `);

  console.log("Banco SQLite sincronizado perfeitamente!");
  return dbInstance;
}

export async function setupDatabase(): Promise<void> {
  await getDatabase();
}