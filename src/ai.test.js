import test from 'node:test'; import assert from 'node:assert/strict'; import { classifyReply } from './ai.js';
test('classifica lead caldo',()=>assert.deepEqual(classifyReply('Possiamo organizzare una call?').suggestedStatus,'LEAD CALDO'));
test('classifica opt-out prima del disinteresse',()=>assert.deepEqual(classifyReply('Non contattatemi più').suggestedStatus,'NON CONTATTARE'));
test('classifica richiesta prezzo',()=>assert.deepEqual(classifyReply('Quanto costa?').suggestedStatus,'INTERESSATO'));
