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
    loading: "Laster...",
    logout: "Logg ut",
    uploading: "Laster opp...",
    tapToChangeImage: "Trykk for å bytte bilde",
    continue: "Fortsett",
    needHelpContactUs: "Trenger du hjelp? Kontakt oss på",

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

    // Welcome / RoleSelection
    welcome: "Velkommen til EnkelUtleie",
    welcomeDesc: "Din komplette løsning for utleie",
    getStarted: "Kom i gang",
    selectYourRole: "Velg din rolle for å komme i gang",
    manageYourRentalUnits: "Administrer dine utleieenheter",
    viewYourRentalAndCommunicate: "Se din leiebolig og kommuniser med utleier",

    // Settings
    profile: "Profil",
    notifications: "Varsler",
    notificationSettings: "Varslingsinnstillinger",
    profileInformation: "Profilinformasjon",
    firstName: "Fornavn",
    lastName: "Etternavn",
    phoneNumber: "Telefonnummer",
    phoneDescription: "Med eller uten landkode, f.eks. +47 eller 0047",
    email: "E-post",
    role: "Rolle",
    saveProfile: "Lagre profil",
    saved: "✓ Lagret!",
    calendarNotifications: "Varsler for hendelser",
    payments: "Betalinger",
    paymentReminders: "Påminnelser om leie",
    messages: "Meldinger",
    newMessages: "Nye meldinger fra leietaker/utleier",
    maintenanceUpdates: "Oppdateringer på oppgaver",
    language: "Språk",
    switchToEnglish: "Bytt til engelsk",
    currentlyActive: "For øyeblikket aktiv",
    privacy: "Personvern",
    dataProcessingConsent: "Samtykke til databehandling",
    gdprConsentDescription: "GDPR-samtykke for lagring av data",
    approved: "✓ Godkjent",
    approve: "Godkjenn",
    approvedOn: "Godkjent:",
    contactSupport: "Kontakt support",
    supportDescription: "Har du spørsmål eller trenger hjelp? Vi er her for deg.",
    troubleshooting: "Feilsøking",
    troubleshootingDescription: "Hvis appen ikke fungerer som forventet, prøv å tilbakestille.",
    hardReset: "Hard tilbakestilling",
    helpAndTaxGuide: "Hjelp & Skatteguide",

    // Errors
    error: "Feil",
    tryAgain: "Prøv igjen",
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
    loading: "Loading...",
    logout: "Log out",
    uploading: "Uploading...",
    tapToChangeImage: "Tap to change image",
    continue: "Continue",
    needHelpContactUs: "Need help? Contact us at",

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

    // Welcome / RoleSelection
    welcome: "Welcome to EnkelUtleie",
    welcomeDesc: "Your complete rental management solution",
    getStarted: "Get Started",
    selectYourRole: "Select your role to get started",
    manageYourRentalUnits: "Manage your rental units",
    viewYourRentalAndCommunicate: "View your rental and communicate with landlord",

    // Settings
    profile: "Profile",
    notifications: "Notifications",
    notificationSettings: "Notification Settings",
    profileInformation: "Profile Information",
    firstName: "First Name",
    lastName: "Last Name",
    phoneNumber: "Phone Number",
    phoneDescription: "With or without country code, e.g. +47 or 0047",
    email: "Email",
    role: "Role",
    saveProfile: "Save Profile",
    saved: "✓ Saved!",
    calendarNotifications: "Notifications for events",
    payments: "Payments",
    paymentReminders: "Rental payment reminders",
    messages: "Messages",
    newMessages: "New messages from tenant/landlord",
    maintenanceUpdates: "Updates on tasks",
    language: "Language",
    switchToEnglish: "Switch to Norwegian",
    currentlyActive: "Currently active",
    privacy: "Privacy",
    dataProcessingConsent: "Data processing consent",
    gdprConsentDescription: "GDPR consent for data storage",
    approved: "✓ Approved",
    approve: "Approve",
    approvedOn: "Approved on:",
    contactSupport: "Contact support",
    supportDescription: "Do you have questions or need help? We are here for you.",
    troubleshooting: "Troubleshooting",
    troubleshootingDescription: "If the app is not working as expected, try resetting.",
    hardReset: "Hard reset",
    helpAndTaxGuide: "Help & Tax Guide",

    // Errors
    error: "Error",
    tryAgain: "Try Again",
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('no');

  const t = (key) => {
    return translations[language][key] || translations['no'][key] || key;
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