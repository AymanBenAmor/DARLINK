
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language = "en" | "fr";


const translations = {
  en: {
    // General
    back: "BACK",
    profile: "MY PROFILE",
    myProfile: "MY PROFILE",
    accountInformation: "Your account information",
    wifi: "WI-FI",
    language: "LANGUAGE",
    chooseLanguage: "CHOOSE LANGUAGE",
    english: "English",
    french: "French",
    close: "CLOSE",
    cancel: "CANCEL",
    save: "SAVE",
    delete: "DELETE",
    logout: "LOG OUT",

    // Dashboard
    myDoors: "MY DOORS",
    door: "DOOR",
    doors: "DOORS",
    addDoor: "ADD DOOR",
    holdToOpen: "HOLD TO OPEN",
    doorInstruction:
      "HOLD A DOOR FOR 1 SECOND, THEN RELEASE TO OPEN",
    noDoors: "No doors added yet",
    addFirstDoor: "Add your first smart door to get started.",
    welcome: "Your home. Your control.",
    footer: "SMART HOME • SECURE ACCESS",

    // Authentication
    signIn: "SIGN IN",
    createAccount: "CREATE ACCOUNT",
    welcomeBack: "Welcome Back",
    createAccountTitle: "Create Account",
    signInDescription: "Sign in to manage your smart home.",
    registerDescription: "Create your personal Smart Home account.",
    fullName: "FULL NAME",
    email: "EMAIL ADDRESS",
    password: "PASSWORD",
    confirmPassword: "CONFIRM PASSWORD",
    forgotPassword: "Forgot password?",
    register: "Register",
    alreadyHaveAccount: "Already have an account? ",
    noAccount: "Don't have an account? ",

    enterEmailPassword: "Please enter your email and password.",
    enterName: "Please enter your name.",
    weakPassword: "Weak password",
    passwordMinLength: "Your password must contain at least 6 characters.",
    passwordMismatch: "Password mismatch",
    passwordsDoNotMatch: "The passwords do not match.",
    somethingWentWrong: "Something went wrong.",
    emailRequired: "Email required",
    enterEmailFirst: "Please enter your email address first.",
    emailSent: "Email sent",
    checkInbox: "Check your inbox for the password reset link.",
    error: "Error",
    resetEmailFailed: "Unable to send the password reset email.",
    yourName: "Enter your name",
    enterPassword: "Enter your password",
    confirmYourPassword: "Confirm your password",
    haveAccount: "Already have an account? ",

    // Account information
    emailAddress: "EMAIL ADDRESS",
    accountId: "ACCOUNT ID",
    accountCreated: "ACCOUNT CREATED",
    notAvailable: "Not available",
    notProvided: "Not provided",
    noEmail: "No email available",
    defaultUser: "Smart Home User",
    loadingProfile: "Loading profile...",

    // Profile - Door photos
    doorPhotos: "DOOR PHOTOS",
    selectDoorPhoto:
      "Select a door below to add or change its picture.",
    doorPhotosDescription:
      "Select a door below to add or change its picture. These photos will also appear on your dashboard.",
    noDoorsProfile: "You have not added any doors yet.",
    addPhoto: "ADD PHOTO",
    changePhoto: "TAP TO CHANGE PHOTO",
    tapChangePhoto: "TAP TO CHANGE PHOTO",
    tapAddPhoto: "TAP TO ADD PHOTO",
    editName: "EDIT NAME",
    renameDoor: "Rename door",
    doorName: "Door name",
    saveName: "SAVE NAME",

    doorAddedSuccessfully: "Door added successfully",
    doorAddedMessage: "Your new door is ready to be configured.",
    ok: "OK",
    unableToAddDoor: "Unable to add door",
    pleaseTryAgain: "Please try again.",

    // Door operations
    deleteDoorTitle: "Delete door?",
    deleteDoorMessage:
      'Are you sure you want to delete "{name}"? This action cannot be undone.',
    nameRequired: "Name required",
    enterDoorName: "Please enter a name for this door.",
    unableRename: "Unable to rename door",
    unableDelete: "Unable to delete door",
    tryAgain: "Please try again.",

    // Door image operations
    imageUpdated: "Image updated",
    imageUpdatedMessage:
      'The image for "{name}" was saved.',
    unableUpdateImage: "Unable to update image",
    permissionRequired: "Permission required",
    photoPermissionMessage:
      "Allow photo library access to choose a door image.",

    // Wi-Fi configuration
    configureWifi: "CONFIGURE WI-FI",
    wifiDescription:
      "Connect directly to a nearby ESP32 controller over Bluetooth. Internet access is not required for this configuration.",
    scanControllers: "SCAN NEARBY CONTROLLERS",
    scanning: "Scanning for 12 seconds...",
    nearbyControllers: "NEARBY CONTROLLERS",
    esp32Controller: "ESP32 controller",
    selected: "SELECTED",
    select: "SELECT",
    ssid: "WI-FI NETWORK NAME (SSID)",
    wifiNetworkName: "WI-FI NETWORK NAME (SSID)",
    enterWifiName: "Please enter the Wi-Fi network name.",
    enterWifiNamePlaceholder: "Enter Wi-Fi name",
    wifiPassword: "WI-FI PASSWORD",
    enterWifiPassword: "Enter Wi-Fi password",
    show: "SHOW",
    hide: "HIDE",
    sendCredentials: "SEND NEW CREDENTIALS",
    wifiSecurity:
      "Only configure a controller you physically own or are authorized to manage. Put the ESP32 into its authorized BLE provisioning mode before scanning.",
    wifiSecurityNote:
      "Only configure a controller you physically own or are authorized to manage. Put the ESP32 into its authorized BLE provisioning mode before scanning.",

    // Bluetooth errors
    bluetoothPermissionMessage:
      "Allow Bluetooth permissions to scan for nearby ESP32 controllers.",
    bluetoothUnavailable: "Bluetooth unavailable",
    enableBluetoothMessage:
      "Please enable Bluetooth and grant the required permissions.",
    bluetoothScanError: "Bluetooth scan error",
    bluetoothError: "Bluetooth error",
    unableScan: "Unable to scan for nearby controllers.",
    controllerRequired: "Controller required",
    selectControllerMessage:
      "Scan and select your ESP32 controller first.",
    ssidRequired: "SSID required",

    // Wi-Fi provisioning results
    credentialsSent: "Credentials sent",
    credentialsSentMessage:
      "The ESP32 received the new Wi-Fi credentials. It should save them and reconnect. This confirms BLE delivery, not yet that the new Wi-Fi connection succeeded.",
    configurationFailed: "Configuration failed",
    configurationFailedMessage:
      "Could not send the Wi-Fi credentials. Make sure the controller is nearby and in provisioning mode.",

    // Database and logout errors
    databaseError: "Database error",
    unableLoadDoors: "Unable to load your doors.",
    logoutError: "Logout error",
    unableLogout: "Unable to log out.",

    // Add door
    addDoorTitle: "Add a new door",
    addDoorDescription:
      "Choose a name that helps you identify this door.",
    doorNamePlaceholder: "e.g. Main Entrance",
    createDoor: "CREATE DOOR",
    resetTargetReminder:
      "Your new door has been created. Please reset the ESP32 controller so it can recognize and manage this new door.",
    holdToOpenInstruction:
      "HOLD A DOOR FOR 1 SECOND",
    tagline: "Your home. Your control.",
    openProfile: "OPEN PROFILE",
    holdToOpenDoor: "HOLD A DOOR FOR 1 SECOND",
    holdToOpenHint:
      "Hold a door for 1 second, then release to open.",
    addNewDoor: "ADD A NEW DOOR",
    unableToLoadDoors: "Unable to load doors. Please try again.",

    authenticationError: "Authentication error",
    chooseDoorName: "Choose a name that helps you identify this door.",
    doorNameRequired: "Door name required",
    missingInformation: "Missing information",

    resetESP32Reminder: "Please reset your controller to detect and configure the newly added door.",
    
  },

  fr: {
    // Général
    back: "RETOUR",
    profile: "MON PROFIL",
    myProfile: "MON PROFIL",
    accountInformation: "Informations de votre compte",
    wifi: "WI-FI",
    language: "LANGUE",
    chooseLanguage: "CHOISIR LA LANGUE",
    english: "Anglais",
    french: "Français",
    close: "FERMER",
    cancel: "ANNULER",
    save: "ENREGISTRER",
    delete: "SUPPRIMER",
    logout: "DÉCONNEXION",

    // Tableau de bord
    myDoors: "MES PORTES",
    door: "PORTE",
    doors: "PORTES",
    addDoor: "AJOUTER UNE PORTE",
    holdToOpen: "MAINTENIR POUR OUVRIR",
    doorInstruction:
      "MAINTENEZ UNE PORTE PENDANT 1 SECONDE, PUIS RELÂCHEZ",
    noDoors: "Aucune porte ajoutée",
    addFirstDoor:
      "Ajoutez votre première porte connectée pour commencer.",
    welcome: "Votre maison. Votre contrôle.",
    footer: "SMART HOME • ACCÈS SÉCURISÉ",

    // Authentification
    signIn: "SE CONNECTER",
    createAccount: "CRÉER UN COMPTE",
    welcomeBack: "Bon retour",
    createAccountTitle: "Créer un compte",
    signInDescription:
      "Connectez-vous pour gérer votre maison connectée.",
    registerDescription:
      "Créez votre compte Smart Home personnel.",
    fullName: "NOM COMPLET",
    email: "ADRESSE E-MAIL",
    password: "MOT DE PASSE",
    confirmPassword: "CONFIRMER LE MOT DE PASSE",
    forgotPassword: "Mot de passe oublié ?",
    register: "S'inscrire",
    alreadyHaveAccount: "Vous avez déjà un compte ? ",
    noAccount: "Vous n'avez pas de compte ? ",

    enterEmailPassword: "Veuillez saisir votre adresse e-mail et votre mot de passe.",
    enterName: "Veuillez saisir votre nom.",
    weakPassword: "Mot de passe faible",
    passwordMinLength: "Votre mot de passe doit contenir au moins 6 caractères.",
    passwordMismatch: "Mots de passe différents",
    passwordsDoNotMatch: "Les mots de passe ne correspondent pas.",
    somethingWentWrong: "Une erreur est survenue.",
    emailRequired: "Adresse e-mail obligatoire",
    enterEmailFirst: "Veuillez d'abord saisir votre adresse e-mail.",
    emailSent: "E-mail envoyé",
    checkInbox: "Consultez votre boîte de réception pour le lien de réinitialisation.",
    error: "Erreur",
    resetEmailFailed: "Impossible d'envoyer l'e-mail de réinitialisation.",
    yourName: "Saisissez votre nom",
    enterPassword: "Saisissez votre mot de passe",
    confirmYourPassword: "Confirmez votre mot de passe",
    haveAccount: "Vous avez déjà un compte ? ",

    // Informations du compte
    emailAddress: "ADRESSE E-MAIL",
    accountId: "IDENTIFIANT DU COMPTE",
    accountCreated: "DATE DE CRÉATION",
    notAvailable: "Non disponible",
    notProvided: "Non renseigné",
    noEmail: "Aucune adresse e-mail disponible",
    defaultUser: "Utilisateur Smart Home",
    loadingProfile: "Chargement du profil...",

    // Profil - Photos des portes
    doorPhotos: "PHOTOS DES PORTES",
    selectDoorPhoto:
      "Sélectionnez une porte pour ajouter ou modifier sa photo.",
    doorPhotosDescription:
      "Sélectionnez une porte ci-dessous pour ajouter ou modifier sa photo. Ces photos apparaîtront également sur votre tableau de bord.",
    noDoorsProfile:
      "Vous n'avez encore ajouté aucune porte.",
    addPhoto: "AJOUTER UNE PHOTO",
    changePhoto: "APPUYER POUR MODIFIER",
    tapChangePhoto: "APPUYER POUR MODIFIER LA PHOTO",
    tapAddPhoto: "APPUYER POUR AJOUTER UNE PHOTO",
    editName: "CHANGER LE NOM",
    renameDoor: "Renommer la porte",
    doorName: "Nom de la porte",
    saveName: "ENREGISTRER",

    doorNameRequired: "Nom de la porte obligatoire",
    doorAddedSuccessfully: "Porte ajoutée avec succès",
    doorAddedMessage: "Votre nouvelle porte est prête à être configurée.",
    ok: "OK",
    unableToAddDoor: "Impossible d'ajouter la porte",
    pleaseTryAgain: "Veuillez réessayer.",

    // Gestion des portes
    deleteDoorTitle: "Supprimer la porte ?",
    deleteDoorMessage:
      'Voulez-vous vraiment supprimer "{name}" ? Cette action est irréversible.',
    nameRequired: "Nom obligatoire",
    enterDoorName:
      "Veuillez saisir un nom pour cette porte.",
    unableRename: "Impossible de renommer la porte",
    unableDelete: "Impossible de supprimer la porte",
    tryAgain: "Veuillez réessayer.",

    // Gestion des photos
    imageUpdated: "Photo mise à jour",
    imageUpdatedMessage:
      'La photo de "{name}" a été enregistrée.',
    unableUpdateImage: "Impossible de modifier la photo",
    permissionRequired: "Autorisation requise",
    photoPermissionMessage:
      "Autorisez l'accès à la galerie pour choisir une photo de porte.",

    // Configuration Wi-Fi
    configureWifi: "CONFIGURER LE WI-FI",
    wifiDescription:
      "Connectez-vous directement à un contrôleur ESP32 à proximité via Bluetooth. Une connexion Internet n'est pas nécessaire.",
    scanControllers: "RECHERCHER LES CONTRÔLEURS",
    scanning: "Recherche pendant 12 secondes...",
    nearbyControllers: "CONTRÔLEURS À PROXIMITÉ",
    esp32Controller: "Contrôleur ESP32",
    selected: "SÉLECTIONNÉ",
    select: "CHOISIR",
    ssid: "NOM DU RÉSEAU WI-FI (SSID)",
    wifiNetworkName: "NOM DU RÉSEAU WI-FI (SSID)",
    enterWifiName: "Veuillez saisir le nom du réseau Wi-Fi.",
    enterWifiNamePlaceholder: "Saisissez le nom du Wi-Fi",
    wifiPassword: "MOT DE PASSE WI-FI",
    enterWifiPassword: "Saisissez le mot de passe Wi-Fi",
    show: "AFFICHER",
    hide: "MASQUER",
    sendCredentials: "ENVOYER LES IDENTIFIANTS",
    wifiSecurity:
      "Configurez uniquement un contrôleur ESP32 que vous possédez ou êtes autorisé à gérer. Activez son mode de configuration BLE avant la recherche.",
    wifiSecurityNote:
      "Configurez uniquement un contrôleur ESP32 que vous possédez ou êtes autorisé à gérer. Activez son mode de configuration BLE avant la recherche.",

    // Erreurs Bluetooth
    bluetoothPermissionMessage:
      "Autorisez le Bluetooth pour rechercher les contrôleurs ESP32 à proximité.",
    bluetoothUnavailable: "Bluetooth indisponible",
    enableBluetoothMessage:
      "Veuillez activer le Bluetooth et accorder les autorisations nécessaires.",
    bluetoothScanError: "Erreur de recherche Bluetooth",
    bluetoothError: "Erreur Bluetooth",
    unableScan:
      "Impossible de rechercher les contrôleurs à proximité.",
    controllerRequired: "Contrôleur requis",
    selectControllerMessage:
      "Recherchez et sélectionnez d'abord votre contrôleur ESP32.",
    ssidRequired: "Nom du réseau requis",

    // Résultat de la configuration Wi-Fi
    credentialsSent: "Identifiants envoyés",
    credentialsSentMessage:
      "L'ESP32 a reçu les nouveaux identifiants Wi-Fi. Il devrait les enregistrer puis se reconnecter. Cela confirme l'envoi via BLE, mais pas encore la réussite de la connexion Wi-Fi.",
    configurationFailed: "Échec de la configuration",
    configurationFailedMessage:
      "Impossible d'envoyer les identifiants Wi-Fi. Vérifiez que le contrôleur est à proximité et en mode de configuration.",

    // Erreurs de base de données et déconnexion
    databaseError: "Erreur de base de données",
    unableLoadDoors: "Impossible de charger vos portes.",
    logoutError: "Erreur de déconnexion",
    unableLogout: "Impossible de se déconnecter.",

    // Ajouter une porte
    addDoorTitle: "Ajouter une porte",
    addDoorDescription:
      "Choisissez un nom pour identifier cette porte.",
    doorNamePlaceholder: "Ex. : Entrée principale",
    createDoor: "CRÉER LA PORTE",
    resetTargetReminder:
      "Votre nouvelle porte a été créée. Veuillez redémarrer le contrôleur ESP32 afin qu'il puisse détecter et gérer cette nouvelle porte.",
    holdToOpenInstruction:
      "MAINTENEZ UNE PORTE PENDANT 1 SECONDE",
    tagline: "Votre maison. Votre contrôle.",
    openProfile: "OUVRIR LE PROFIL",
    holdToOpenDoor: "MAINTENEZ UNE PORTE PENDANT 1 SECONDE",
    holdToOpenHint:
      "Maintenez une porte pendant 1 seconde, puis relâchez pour l'ouvrir.",
    addNewDoor: "AJOUTER UNE NOUVELLE PORTE",
    unableToLoadDoors: "Impossible de charger les portes. Veuillez réessayer.",
    authenticationError: "Erreur d'authentification",
    chooseDoorName: "Choisissez un nom qui vous permet d'identifier cette porte.",

    missingInformation: "Informations manquantes",

    resetESP32Reminder: "Veuillez redémarrer votre contrôleur afin qu'il détecte et configure la nouvelle porte.",

  },
} as const;

export type TranslationKey = keyof typeof translations.en;

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>("en");
  const [languageLoaded, setLanguageLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLanguage() {
      try {
        const saved = await AsyncStorage.getItem("appLanguage");

        if (mounted && (saved === "en" || saved === "fr")) {
          setLanguageState(saved);
        }
      } catch (error) {
        console.error("Unable to load language preference:", error);
      } finally {
        if (mounted) {
          setLanguageLoaded(true);
        }
      }
    }

    void loadLanguage();

    return () => {
      mounted = false;
    };
  }, []);

  async function setLanguage(next: Language) {
    setLanguageState(next);

    try {
      await AsyncStorage.setItem("appLanguage", next);
    } catch (error) {
      console.error("Unable to save language preference:", error);
      throw error;
    }
  }

  function t(key: TranslationKey): string {
    return translations[language][key];
  }

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
}
