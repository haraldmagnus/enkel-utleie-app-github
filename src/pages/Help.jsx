import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Mail, ExternalLink } from 'lucide-react';

const FAQS = [
  { q: 'Hvordan legger jeg til en ny eiendom?', a: 'Gå til "Eiendommer" i bunnen og trykk "Legg til". Fyll inn adresse, leiebeløp og annen info. Eiendommen vil vises i oversikten din.' },
  { q: 'Hvordan inviterer jeg en leietaker?', a: 'Åpne eiendommen, gå til "Oversikt" og trykk "Inviter" under Leietaker-seksjonen. Skriv inn leietakerens e-post – de mottar en invitasjonslenke.' },
  { q: 'Hvordan oppretter jeg en leieavtale?', a: 'Åpne eiendommen og gå til "Dokumenter". Trykk "Opprett leieavtale", fyll inn detaljene og send til leietaker for signering.' },
  { q: 'Hvordan fungerer digital signering?', a: 'Etter at du har sendt avtalen, mottar leietaker en varsling. Begge parter logger inn og signerer digitalt. Avtalen aktiveres når begge har signert.' },
  { q: 'Kan jeg ha flere leietakere på én eiendom?', a: 'Ja – inviter flere leietakere ved å bruke invitasjonsfunksjonen. Alle inviterte får tilgang til boliginformasjon og chat.' },
  { q: 'Hvordan registrerer jeg inntekter og utgifter?', a: 'Åpne eiendommen og gå til "Økonomi"-fanen. Trykk "+ Ny" og velg type (inntekt/utgift), kategori og beløp.' },
  { q: 'Hvordan fungerer skatteberegningen?', a: 'Under "Økonomi" ser du en estimert skatteberegning basert på skattetype du velger. Dette er kun veiledende – konsulter en regnskapsfører for nøyaktige tall.' },
  { q: 'Hvordan bytter jeg mellom utleier- og leietaker-rollen?', a: 'Gå til "Innstillinger" og trykk "Bytt rolle". Du kan ha begge roller i appen.' },
  { q: 'Hva gjør jeg om en leietaker ikke har fått invitasjonen?', a: 'Sjekk at e-postadressen er riktig, og at e-posten ikke havnet i søppelpost. Du kan sende en ny invitasjon fra eiendomsdetaljene.' },
  { q: 'Kan jeg laste opp en eksisterende leieavtale?', a: 'Ja – under "Dokumenter" på eiendommen kan du laste opp en PDF-fil av en eksisterende avtale.' },
];

export default function Help() {
  const [open, setOpen] = useState(null);

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Contact */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
        <h2 className="font-bold text-lg mb-1">Trenger du hjelp?</h2>
        <p className="text-blue-200 text-sm mb-4">Vi er her for å hjelpe deg med Enkel Utleie.</p>
        <a href="mailto:support@enkelutleie.no" className="inline-flex items-center gap-2 bg-white text-blue-600 rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-blue-50 transition-colors">
          <Mail className="w-4 h-4" /> Kontakt support
        </a>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Vanlige spørsmål</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {FAQS.map((faq, i) => (
            <div key={i}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors">
                <span className="font-medium text-gray-900 text-sm pr-4">{faq.q}</span>
                {open === i ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              </button>
              {open === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Useful links */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Nyttige ressurser</h2>
        </div>
        {[
          { label: 'Husleieloven', url: 'https://lovdata.no/dokument/NL/lov/1999-03-26-17' },
          { label: 'Husleietvistutvalget', url: 'https://www.htu.no' },
          { label: 'Skatteetaten – utleie', url: 'https://www.skatteetaten.no/person/skatt/hjelp-til-riktig-skatt/bolig-og-eiendeler/utleie/' },
        ].map(({ label, url }, i) => (
          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-50' : ''}`}>
            <span className="text-sm font-medium text-gray-800">{label}</span>
            <ExternalLink className="w-4 h-4 text-gray-300" />
          </a>
        ))}
      </div>
    </div>
  );
}