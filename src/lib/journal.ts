import fs from 'fs';
import path from 'path';
import { rootDir } from './genome.js';

export const journalPath = path.join(rootDir, 'exocortex', 'journal.md');
export const fifthJournalPath = path.join(rootDir, 'exocortex', 'fifth.md');

export function appendJournal(entry: string): void {
  const existing = fs.readFileSync(journalPath, 'utf8');
  fs.writeFileSync(journalPath, existing + '\n' + entry);
}

export function appendFifthJournal(entry: string): void {
  const existing = fs.readFileSync(fifthJournalPath, 'utf8');
  fs.writeFileSync(fifthJournalPath, existing + entry);
}

export function getRecentJournal(chars: number = 2000): string {
  try {
    let journal = fs.readFileSync(journalPath, 'utf8');
    if (journal.length > chars) {
      journal = journal.slice(-chars);
      const headingIdx = journal.indexOf('\n## ');
      if (headingIdx >= 0) {
        journal = journal.slice(headingIdx);
      }
    }
    return journal;
  } catch {
    return '';
  }
}

export function countDecisions(): number {
  try {
    const journal = fs.readFileSync(journalPath, 'utf8');
    const matches = journal.match(/## Decision — Autonomous/g);
    return matches ? matches.length : 0;
  } catch {
    return 0;
  }
}

export function readJournal(): string {
  try {
    return fs.readFileSync(journalPath, 'utf8');
  } catch {
    return '';
  }
}
