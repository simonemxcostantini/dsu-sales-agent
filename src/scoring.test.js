import test from 'node:test';
import assert from 'node:assert/strict';
import { deterministicScore } from '../supabase/functions/_shared/scoring.js';

test('assegna punti solo a segnali verificabili', () => {
  const result = deterministicScore({ disciplines:['Hip Hop','Breaking'], teacher_count:4, recent_activity:true, business_email:'info@example.test', website_url:'https://example.test', instagram_handle:'@demo' }, [{ evidence_text:'Corsi attivi', extracted_facts:{ disciplines:['Hip Hop'], recent_activity:true } }]);
  assert.equal(result.score, 100);
  assert.equal(result.streetRelevant, true);
});

test('non inventa segnali quando i dati mancano', () => {
  const result = deterministicScore({ disciplines:[] }, []);
  assert.equal(result.score, 0);
  assert.deepEqual(result.signals, []);
});
