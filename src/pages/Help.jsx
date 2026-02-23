import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, FileText, ExternalLink, BookOpen, Calculator, Home, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const FAQ_ITEMS = [
  { category: 'Generelt', questions: [
    { q: 'Hvordan inviterer jeg en leietaker?', a: 'Gå til en eiendom → trykk "Inviter leietaker" → skriv inn leietakerens e-postadresse. Leietakeren mottar en e-post med lenke til å opprette konto og koble seg til eiendommen din.' },
    { q: 'Kan jeg ha flere eiendommer?', a: 'Ja, du kan ha opptil 5 eiendommer i appen. Legg til nye via "+" på Eiendommer-siden.' },
    { q: 'Hvordan fungerer leieavtalen i appen?', a: 'Du kan opprette en digital leieavtale under eiendommen. Begge parter signerer digitalt inne i appen. Du kan også laste opp en eksisterende PDF-avtale.' },
    { q: 'Hva skjer når en leietaker flytter ut?', a: 'Du kan avslutte leieforholdet fra eiendomssiden. Husk å dokumentere tilstanden med bilder via "Utflyttingsbilder" og sammenlign med innflyttingsbildene.' },
  ]},
  { category: 'Økonomi', questions: [
    { q: 'Hva slags inntekter og utgifter kan jeg registrere?', a: 'Du kan registrere husleie, depositum, vedlikehold, reparasjoner, strøm/vann, forsikring, skatter og andre poster. Gå til Økonomi-siden og trykk "Legg til post".' },
    { q: 'Kan jeg laste ned en rapport over inntektene mine?', a: 'Ja! Gå til "Årsrapport" fra dashbordet. Du kan filtrere per år og eiendom, og laste ned som CSV-fil for bruk i Excel eller regnskapsprogram.' },
    { q: 'Hvordan holder jeg oversikt over betalingspåminnelser?', a: 'Under en eiendom finner du "Betalingspåminnelser". Her setter du opp automatiske påminnelser til leietaker om forfallsdato for husleie.' },
  ]},
  { category: 'Vedlikehold', questions: [
    { q: 'Hvordan rapporterer leietaker vedlikeholdsbehov?', a: 'Leietaker kan sende vedlikeholdsforespørsler direkte i appen fra sitt dashboard. Du som utleier mottar varsel og kan følge opp i vedlikeholdsloggen.' },
    { q: 'Kan jeg legge til håndverkere på en vedlikeholdsoppgave?', a: 'Ja, du kan legge inn kontaktinformasjon for håndverkere (navn, telefon, e-post) direkte på oppgaven, samt registrere estimert og faktisk kostnad.' },
  ]},
];

const TAX_GUIDE_SECTIONS = [
  { icon: Calculator, color: 'bg-blue-100 text-blue-600', title: 'Hva skal rapporteres til Skatteetaten?', content: ['Skattepliktige leieinntekter skal rapporteres i skattemeldingen. Skattefrie inntekter trenger normalt ikke rapporteres.', 'Utleie av bolig du selv ikke bor i (sekundærbolig): All leieinntekt er skattepliktig fra første krone og skal føres i skattemeldingen.', 'Utleie av del av egen bolig (f.eks. sokkel): Kan være skattefri dersom du selv bruker minst halvparten av boligen (målt etter utleieverdi).', 'Utleie av fritidseiendom (korttidsutleie, under 30 dager): Skattefritt inntil 15 000 kr per år. Av det overskytende beløpet skattlegges 85 % med 22 %.'] },
  { icon: FileText, color: 'bg-green-100 text-green-600', title: 'Hva kan du trekke fra?', content: ['Vedlikeholdskostnader direkte knyttet til utleien (ikke påkostninger/forbedringer)', 'Forsikringspremier for utleieboligen', 'Kommunale avgifter og eiendomsskatt for den utleide delen', 'Regnskapsføring og administrative kostnader for utleievirksomheten'] },
  { icon: Home, color: 'bg-purple-100 text-purple-600', title: 'Slik bruker du appen for skatteformål', content: ['1. Registrer alle leieinntekter under Økonomi → Kategori: Husleie', '2. Registrer alle fradragsberettigede utgifter (vedlikehold, forsikring, etc.)', '3. Last opp kvitteringer som dokumentasjon til hver post', '4. Gå til Årsrapport og velg ønsket år → last ned CSV'] },
  { icon: BookOpen, color: 'bg-orange-100 text-orange-600', title: 'Viktige frister og satser (2025)', content: ['Frist for skattemeldingen: Vanligvis ca. 30. april', 'Skattesats på netto leieinntekt: 22 % (alminnelig inntekt)', 'Fribeløp korttidsutleie av fritidseiendom: 15 000 kr (oppdatert for 2025)', 'Depositum er ikke skattepliktig når det mottas'] },
];

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button className="w-full text-left flex items-center justify-between py-3 gap-2" onClick={() => setOpen(!open)}>
        <span className="text-sm font-medium text-slate-800">{question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && <p className="text-sm text-slate-600 pb-3 leading-relaxed">{answer}</p>}
    </div>
  );
}

export default function Help() {
  const [activeTab, setActiveTab] = useState('guide');

  return (
    <div className="pb-20">
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-600" /> Hjelp & Guide
        </h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          <button className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'guide' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`} onClick={() => setActiveTab('guide')}>Skatteguide</button>
          <button className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'faq' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`} onClick={() => setActiveTab('faq')}>Vanlige spørsmål</button>
        </div>

        {activeTab === 'guide' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 leading-relaxed"><strong>Obs:</strong> Denne guiden er ment som generell veiledning. Skatteregler kan endre seg. Kontakt Skatteetaten eller en regnskapsfører ved tvil.</p>
            </div>
            {TAX_GUIDE_SECTIONS.map((section, i) => {
              const Icon = section.icon;
              return (
                <Card key={i} className="bg-white shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}><Icon className="w-4 h-4" /></div>
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.content.map((line, j) => (
                        <li key={j} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                          <span className="text-slate-400 mt-0.5 flex-shrink-0">•</span><span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4 text-slate-500" /> Nyttige lenker</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: 'Skatteetaten – Utleie av bolig', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/utleie-av-bolig/' },
                  { label: 'Skattemeldingen (skatteetaten.no)', url: 'https://www.skatteetaten.no/person/skatt/skattemelding/' },
                  { label: 'Husleieloven (lovdata.no)', url: 'https://lovdata.no/dokument/NL/lov/1999-03-26-17' },
                ].map((link, i) => (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <span className="text-sm text-blue-600 font-medium">{link.label}</span>
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-4">
            {FAQ_ITEMS.map((section, i) => (
              <Card key={i} className="bg-white shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2"><Badge variant="secondary">{section.category}</Badge></CardTitle></CardHeader>
                <CardContent className="pt-0">{section.questions.map((item, j) => <AccordionItem key={j} question={item.q} answer={item.a} />)}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}