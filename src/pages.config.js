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
import AddProperty from './pages/AddProperty';
import CalendarPage from './pages/CalendarPage';
import CreateAgreement from './pages/CreateAgreement';
import EditProperty from './pages/EditProperty';
import Finances from './pages/Finances';
import Notifications from './pages/Notifications';
import PaymentReminders from './pages/PaymentReminders';
import Properties from './pages/Properties';
import SignAgreement from './pages/SignAgreement';
import TenantPhotos from './pages/TenantPhotos';
import YearlyReport from './pages/YearlyReport';
import Dashboard from './pages/Dashboard';
import RoleSelection from './pages/RoleSelection';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import CompleteProfile from './pages/CompleteProfile';
import Invite from './pages/Invite';
import TenantDashboard from './pages/TenantDashboard';
import PropertyDetail from './pages/PropertyDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddProperty": AddProperty,
    "CalendarPage": CalendarPage,
    "CreateAgreement": CreateAgreement,
    "EditProperty": EditProperty,
    "Finances": Finances,
    "Notifications": Notifications,
    "PaymentReminders": PaymentReminders,
    "Properties": Properties,
    "SignAgreement": SignAgreement,
    "TenantPhotos": TenantPhotos,
    "YearlyReport": YearlyReport,
    "Dashboard": Dashboard,
    "RoleSelection": RoleSelection,
    "Chat": Chat,
    "Settings": Settings,
    "CompleteProfile": CompleteProfile,
    "Invite": Invite,
    "TenantDashboard": TenantDashboard,
    "PropertyDetail": PropertyDetail,
}

export const pagesConfig = {
    mainPage: "RoleSelection",
    Pages: PAGES,
    Layout: __Layout,
};