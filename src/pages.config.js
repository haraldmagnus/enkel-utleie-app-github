/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AcceptCoLandlord from './pages/AcceptCoLandlord';
import AddProperty from './pages/AddProperty';
import CompleteProfile from './pages/CompleteProfile';
import CreateAgreement from './pages/CreateAgreement';
import EditProperty from './pages/EditProperty';
import ErrorLogs from './pages/ErrorLogs';
import FinancesExpense from './pages/FinancesExpense';
import FinancesIncome from './pages/FinancesIncome';
import FinancesNet from './pages/FinancesNet';
import FinancesTax from './pages/FinancesTax';
import Help from './pages/Help';
import Invite from './pages/Invite';
import Notifications from './pages/Notifications';
import PaymentReminders from './pages/PaymentReminders';
import RoleSelection from './pages/RoleSelection';
import SignAgreement from './pages/SignAgreement';
import TenantPhotos from './pages/TenantPhotos';
import YearlyReport from './pages/YearlyReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcceptCoLandlord": AcceptCoLandlord,
    "AddProperty": AddProperty,
    "CompleteProfile": CompleteProfile,
    "CreateAgreement": CreateAgreement,
    "EditProperty": EditProperty,
    "ErrorLogs": ErrorLogs,
    "FinancesExpense": FinancesExpense,
    "FinancesIncome": FinancesIncome,
    "FinancesNet": FinancesNet,
    "FinancesTax": FinancesTax,
    "Help": Help,
    "Invite": Invite,
    "Notifications": Notifications,
    "PaymentReminders": PaymentReminders,
    "RoleSelection": RoleSelection,
    "SignAgreement": SignAgreement,
    "TenantPhotos": TenantPhotos,
    "YearlyReport": YearlyReport,
}

export const pagesConfig = {
    mainPage: "AcceptCoLandlord",
    Pages: PAGES,
    Layout: __Layout,
};