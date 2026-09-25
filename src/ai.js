export function classifyReply(text) {
 const value=text.toLowerCase();
 if (/non contatt|cancell|opt.?out/.test(value)) return {label:'Richiesta opt-out',suggestedStatus:'NON CONTATTARE',hot:false};
 if (/non.*interess|no grazie/.test(value)) return {label:'Non interessato',suggestedStatus:'NON INTERESSATO',hot:false};
 if (/call|telefon|appuntamento|iscriv|più insegnanti|acquist/.test(value)) return {label:'Forte intenzione commerciale',suggestedStatus:'LEAD CALDO',hot:true};
 if (/costa|prezzo|funziona|informaz|programma/.test(value)) return {label:'Richiesta informazioni',suggestedStatus:'INTERESSATO',hot:false};
 return {label:'Risposta ricevuta',suggestedStatus:'HA RISPOSTO',hot:false};
}
export function generateDraft(prospect,reply='') {
 if (/costa|prezzo/i.test(reply)) return `Ciao ${prospect.firstName}, grazie per il tuo interesse! Il DSU Dance Teacher Program costa 699 € e comprende 6 mesi di formazione online, moduli video, esercizi, 6 call live, esame finale, community e diploma. Vuoi che ti spieghi come iscriversi?`;
 if (/call|telefon|appuntamento/i.test(reply)) return `Ciao ${prospect.firstName}, certamente! Sarà un piacere approfondire il programma insieme. Indicaci le fasce orarie che preferisci e una persona del team DSU ti ricontatterà per concordare la call.`;
 return `Ciao ${prospect.firstName}, grazie per averci scritto! Il DSU Dance Teacher Program è un percorso professionale online di 6 mesi pensato per far crescere insegnanti e dancer. Posso darti maggiori dettagli sul programma o sull’iscrizione?`;
}
