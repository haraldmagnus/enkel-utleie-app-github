import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  no: {
    // Navigation
    home: "Hjem",
    properties: "Eiendommer",
    finances: "Økonomi",
    calendar: "Kalender",
    chat: "Meldinger",
    settings: "Innstillinger",
    
    // Roles
    landlord: "Utleier",
    tenant: "Leietaker",
    selectRole: "Velg din rolle",
    
    // Common
    save: "Lagre",
    cancel: "Avbryt",
    delete: "Slett",
    edit: "Rediger",
    add: "Legg til",
    back: "Tilbake",
    next: "Neste",
    confirm: "Bekreft",
    search: "Søk",
    
    // Properties
    addProperty: "Legg til eiendom",
    propertyName: "Navn på eiendom",
    address: "Adresse",
    monthlyRent: "Månedlig leie",
    description: "Beskrivelse",
    vacant: "Ledig",
    occupied: "Utleid",
    pending_invitation: "Venter på svar",
    inviteTenant: "Inviter leietaker",
    tenantEmail: "Leietakers e-post",
    sendInvitation: "Send invitasjon",
    moveInPhotos: "Innflyttingsbilder",
    moveOutPhotos: "Utflyttingsbilder",
    uploadPhotos: "Last opp bilder",
    maxProperties: "Du kan maks ha 5 eiendommer",
    
    // Agreement
    rentalAgreement: "Leieavtale",
    createAgreement: "Opprett leieavtale",
    startDate: "Startdato",
    endDate: "Sluttdato",
    deposit: "Depositum",
    terms: "Vilkår og betingelser",
    signAgreement: "Signer avtale",
    signed: "Signert",
    notSigned: "Ikke signert",
    pendingSignature: "Venter på signatur",
    
    // Finances
    income: "Inntekt",
    expense: "Utgift",
    addEntry: "Legg til post",
    totalIncome: "Total inntekt",
    totalExpenses: "Totale utgifter",
    netIncome: "Netto inntekt",
    exportData: "Eksporter data",
    category: "Kategori",
    amount: "Beløp",
    date: "Dato",
    rent: "Husleie",
    maintenance: "Vedlikehold",
    repairs: "Reparasjoner",
    utilities: "Strøm/vann",
    insurance: "Forsikring",
    taxes: "Skatter",
    other: "Annet",
    
    // Calendar
    addEvent: "Legg til hendelse",
    eventTitle: "Tittel",
    eventType: "Type hendelse",
    inspection: "Inspeksjon",
    meeting: "Møte",
    repair: "Reparasjon",
    
    // Chat
    typeMessage: "Skriv en melding...",
    send: "Send",
    noMessages: "Ingen meldinger ennå",
    
    // Welcome
    welcome: "Velkommen til Utleieoversikt",
    welcomeDesc: "Din komplette løsning for utleie",
    getStarted: "Kom i gang",
    
    // Errors
    error: "Feil",
    tryAgain: "Prøv igjen"
  },
  en: {
    // Navigation
    home: "Home",
    properties: "Properties",
    finances: "Finances",
    calendar: "Calendar",
    chat: "Messages",
    settings: "Settings",
    
    // Roles
    landlord: "Landlord",
    tenant: "Tenant",
    selectRole: "Select your role",
    
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    back: "Back",
    next: "Next",
    confirm: "Confirm",
    search: "Search",
    
    // Properties
    addProperty: "Add Property",
    propertyName: "Property Name",
    address: "Address",
    monthlyRent: "Monthly Rent",
    description: "Description",
    vacant: "Vacant",
    occupied: "Occupied",
    pending_invitation: "Pending",
    inviteTenant: "Invite Tenant",
    tenantEmail: "Tenant Email",
    sendInvitation: "Send Invitation",
    moveInPhotos: "Move-in Photos",
    moveOutPhotos: "Move-out Photos",
    uploadPhotos: "Upload Photos",
    maxProperties: "Maximum 5 properties allowed",
    
    // Agreement
    rentalAgreement: "Rental Agreement",
    createAgreement: "Create Agreement",
    startDate: "Start Date",
    endDate: "End Date",
    deposit: "Deposit",
    terms: "Terms and Conditions",
    signAgreement: "Sign Agreement",
    signed: "Signed",
    notSigned: "Not Signed",
    pendingSignature: "Pending Signature",
    
    // Finances
    income: "Income",
    expense: "Expense",
    addEntry: "Add Entry",
    totalIncome: "Total Income",
    totalExpenses: "Total Expenses",
    netIncome: "Net Income",
    exportData: "Export Data",
    category: "Category",
    amount: "Amount",
    date: "Date",
    rent: "Rent",
    maintenance: "Maintenance",
    repairs: "Repairs",
    utilities: "Utilities",
    insurance: "Insurance",
    taxes: "Taxes",
    other: "Other",
    
    // Calendar
    addEvent: "Add Event",
    eventTitle: "Title",
    eventType: "Event Type",
    inspection: "Inspection",
    meeting: "Meeting",
    repair: "Repair",
    
    // Chat
    typeMessage: "Type a message...",
    send: "Send",
    noMessages: "No messages yet",
    
    // Welcome
    welcome: "Welcome to Utleieoversikt",
    welcomeDesc: "Your complete rental management solution",
    getStarted: "Get Started",
    
    // Errors
    error: "Error",
    tryAgain: "Try Again"
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('no');

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;