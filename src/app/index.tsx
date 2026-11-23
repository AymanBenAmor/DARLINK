import { useRouter } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { onValue, push, ref, set } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageStyle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../context/LanguageContext";

import { auth, database } from "../../firebaseConfig";
import {
  loginUser,
  registerUser,
  resetPassword,
} from "../../Services/authService";

import { useAudioPlayer } from "expo-audio";

type Screen = "login" | "register";
type Door = {
  id: string;
  name: string;
  imageBase64?: string;
};

export default function App() {

  const successPlayer = useAudioPlayer(
  require("../../assets/sounds/success.wav")
);

  const failurePlayer = useAudioPlayer(
    require("../../assets/sounds/failure.wav")
  );


  const router = useRouter();
  const { t } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [doors, setDoors] = useState<Door[]>([]);
  const [doorsLoading, setDoorsLoading] = useState(true);
  const [addDoorVisible, setAddDoorVisible] = useState(false);
  const [newDoorName, setNewDoorName] = useState("");
  const [addingDoor, setAddingDoor] = useState(false);
  const longPressedDoorId = useRef<string | null>(null);
  const [openingDoorId, setOpeningDoorId] = useState<string | null>(null);
  const [glowingDoorId, setGlowingDoorId] = useState<string | null>(null);
  // Keep the glow color discrete so blue never animates through green to red.
  const [doorGlowColor, setDoorGlowColor] = useState("#268BFF");
  const doorGlowOpacity = useRef(new Animated.Value(0)).current;


  function playAckSound(success: boolean) {
  try {
    const player = success ? successPlayer : failurePlayer;

    player.seekTo(0);
    player.play();
  } catch (error) {
    console.warn("[AUDIO] Could not play acknowledgment sound:", error);
  }
}

  // Restore and observe the Firebase authentication session.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Each account listens only to its own doors collection.
  useEffect(() => {
    if (!user) {
      setDoors([]);
      setDoorsLoading(false);
      return;
    }

    setDoorsLoading(true);
    const doorsRef = ref(database, `doors/${user.uid}`);
    const unsubscribe = onValue(
      doorsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data || typeof data !== "object") {
          setDoors([]);
        } else {
          // Ignore legacy fields directly under doors/{uid}.
          const parsedDoors = Object.entries(data as Record<string, any>)
            .filter(
              ([, value]) =>
                value !== null &&
                typeof value === "object" &&
                typeof value.name === "string"
            )
            .map(([id, value]) => ({
              id,
              name: value.name as string,
              imageBase64:
                typeof value.imageBase64 === "string"
                  ? value.imageBase64
                  : undefined,
            }));

          setDoors(parsedDoors);
        }

        setDoorsLoading(false);
      },
      (error) => {
        console.error("Doors listener error:", error.message);
        setDoorsLoading(false);
        Alert.alert(t("databaseError"), t("unableToLoadDoors"));
      }
    );

    return unsubscribe;
  }, [user]);

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t("missingInformation"), t("enterEmailPassword"));
      return;
    }

    if (screen === "register") {
      if (!name.trim()) {
        Alert.alert(t("missingInformation"), t("enterName"));
        return;
      }
      if (password.length < 6) {
        Alert.alert(t("weakPassword"), t("passwordMinLength"));
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert(t("passwordMismatch"), t("passwordsDoNotMatch"));
        return;
      }
    }

    try {
      setSubmitting(true);

      if (screen === "register") {
        await registerUser(name, email, password);
        Alert.alert(t("welcome"), t("accountCreated"));
      } else {
        await loginUser(email, password);
      }

      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error(error);
      Alert.alert(t("authenticationError"), error?.message || t("somethingWentWrong"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert(t("emailRequired"), t("enterEmailFirst"));
      return;
    }

    try {
      await resetPassword(email.trim());
      Alert.alert(t("emailSent"), t("checkInbox"));
    } catch (error: any) {
      Alert.alert(t("error"), error?.message || t("resetEmailFailed"));
    }
  }

  async function handleAddDoor() {
    const trimmedName = newDoorName.trim();

    if (!trimmedName) {
      Alert.alert(t("doorNameRequired"), t("enterDoorName"));
      return;
    }
    if (!user) return;

    try {
      setAddingDoor(true);

      const doorsRef = ref(database, `doors/${user.uid}`);
      const newDoorRef = push(doorsRef);
      const now = Date.now();

      await set(newDoorRef, {
        name: trimmedName,
        createdAt: now,
        command: {
          action: "none",
          timestamp: 0,
          ack: false,
          ackRequestId: 0,
        },
        status: {
          state: "unknown",
          esp32Online: false,
          lastUpdate: now,
        },
      });

      setNewDoorName("");
      setAddDoorVisible(false);

      Alert.alert(
        t("doorAddedSuccessfully"),
        `${t("doorAddedMessage")}\n\n⚠️ ${t("resetESP32Reminder")}`,
        [{ text: t("ok"), style: "default" }]
      );

    } catch (error: any) {
      console.error("Add door error:", error);
      Alert.alert(t("unableToAddDoor"), error?.message || t("pleaseTryAgain"));
    } finally {
      setAddingDoor(false);
    }
  }

  // A door opens only after a deliberate 1.5-second long press
  // followed by releasing the finger while still on that door tile.
  function handleDoorLongPress(doorId: string) {
    //console.log("[DOOR] Long press detected:", doorId);
    longPressedDoorId.current = doorId;
    Vibration.vibrate(300);
  }

  async function handleDoorPressOut(doorId: string) {
    // onPressOut is used instead of onPress so the request is sent
    // reliably when the user releases after the long-press threshold.
    if (longPressedDoorId.current !== doorId) {
      //console.log("[DOOR] Release without a completed long press:", doorId);
      return;
    }

    //console.log("[DOOR] Long-press released; sending request:", doorId);
    longPressedDoorId.current = null;
    await sendOpenRequest(doorId);
  }

  // Animate only the glow intensity. The color itself changes instantly,
  // preventing a timeout transition from briefly passing through green.
  function fadeDoorGlowOut() {
    Animated.timing(doorGlowOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }

  function wait(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Send an OPEN request, wait up to 5 seconds for the ESP32 ACK,
  // then reset the command node whether it succeeds or times out.
  async function sendOpenRequest(doorId: string) {
    if (!user || openingDoorId !== null) return;

    const requestId = Date.now();
    const commandRef = ref(database, `doors/${user.uid}/${doorId}/command`);


    //console.log("[DOOR] Starting request", { doorId, requestId });
    setOpeningDoorId(doorId);
    setGlowingDoorId(doorId);
    setDoorGlowColor("#268BFF");
    doorGlowOpacity.setValue(0.95); // Blue glow appears as soon as the request starts.

    let unsubscribe: (() => void) | null = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    let resolveAcknowledgment!: (acknowledged: boolean) => void;
    let resultSoundPlayed = false;

    const acknowledgmentPromise = new Promise<boolean>((resolve) => {
      resolveAcknowledgment = (acknowledged) => {
        if (settled) return;
        settled = true;
        resolve(acknowledged);
      };
    });

    try {
      // Listen before writing so a fast acknowledgment is not missed.
      unsubscribe = onValue(
        commandRef,
        (snapshot) => {
          const command = snapshot.val();
          //console.log("[DOOR] Firebase command update:", command);

          if (
            command?.action === "open" &&
            Number(command?.timestamp) === requestId &&
            command?.ack === true &&
            Number(command?.ackRequestId) === requestId
          ) {
            //console.log("[DOOR] Matching ESP32 acknowledgment received.");
            resolveAcknowledgment(true);
          }
        },
        (error) => {
          console.error("[DOOR] Acknowledgment listener error:", error);
          resolveAcknowledgment(false);
        }
      );

      timeoutHandle = setTimeout(() => {
        // console.warn("[DOOR] ACK timeout after 5 seconds.");
        resolveAcknowledgment(false);
      }, 8000);

      await set(commandRef, {
        action: "open",
        timestamp: requestId,
        ack: false,
        ackRequestId: 0,
      });
      //console.log("[DOOR] OPEN request successfully written to Firebase.");

      const acknowledged = await acknowledgmentPromise;

      if (timeoutHandle) clearTimeout(timeoutHandle);
      unsubscribe?.();
      unsubscribe = null;

      // Play exactly one sound for this acknowledgment result.
      playAckSound(acknowledged);
      resultSoundPlayed = true;

      // Switch directly to the result color; do not interpolate colors.
      setDoorGlowColor(acknowledged ? "#20D477" : "#FF4545");
      await wait(1500);

      await set(commandRef, {
        action: "none",
        timestamp: 0,
        ack: false,
        ackRequestId: 0,
      });
      //console.log("[DOOR] Firebase command reset to default.");

      fadeDoorGlowOut();
      await wait(380);
      setGlowingDoorId(null);
    } catch (error: any) {
      console.error("[DOOR] Open request failed:", error);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      unsubscribe?.();

      // A Firebase write/listener error is also indicated directly in red.
      setDoorGlowColor("#FF4545");
      await wait(1500);

      if (!resultSoundPlayed) {
        playAckSound(false);
        resultSoundPlayed = true;
      }

      try {
        await set(commandRef, {
          action: "none",
          timestamp: 0,
          ack: false,
          ackRequestId: 0,
        });
      } catch (resetError) {
        console.error("[DOOR] Could not reset command:", resetError);
      }

      fadeDoorGlowOut();
      await wait(380);
      setGlowingDoorId(null);
    } finally {
      setOpeningDoorId(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5B9BFF" />
      </View>
    );
  }

  // ============================
  // SMART HOME DASHBOARD
  // ============================
  if (user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content"/>

        <ScrollView
          style={styles.dashboardScroll}
          contentContainerStyle={styles.dashboard}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>SMART HOME</Text>
              <Text style={styles.welcome}>{t("tagline")}</Text>
            </View>

            <TouchableOpacity
              style={styles.profileIconButton}
              onPress={() => router.push("/profile")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t("openProfile")}
            >
              <View style={styles.profileIconHead} />
              <View style={styles.profileIconBody} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("myDoors")}</Text>
            <Text style={styles.doorCount}>
              {doors.length} {doors.length === 1 ? t("door") : t("doors")}
            </Text>
          </View>

          {doors.length > 0 && (
            <Text style={styles.doorInstruction}>
              {t("holdToOpenInstruction")}
            </Text>
          )}

          {doorsLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#5B9BFF" />
            </View>
          ) : doors.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyHomeIcon}>
                <Text style={styles.emptyHomeGlyph}>⌂</Text>
              </View>
              <Text style={styles.emptyTitle}>{t("noDoors")}</Text>
              <Text style={styles.emptyDescription}>
                {t("addFirstDoor")}
              </Text>
            </View>
          ) : (
            <View style={styles.doorGrid}>
              {doors.map((door) => (
                <Animated.View
                  key={door.id}
                  style={[
                    styles.doorTileFrame,
                    {
                      borderColor: glowingDoorId === door.id
                        ? doorGlowColor
                        : "transparent",
                      shadowColor: glowingDoorId === door.id
                        ? doorGlowColor
                        : "transparent",
                      shadowOpacity: glowingDoorId === door.id
                        ? doorGlowOpacity
                        : 0,
                      elevation: glowingDoorId === door.id ? 14 : 0,
                    },
                  ]}
                >
                <Pressable
                  style={styles.doorTile}
                  disabled={openingDoorId !== null}
                  delayLongPress={1000}
                  onPressIn={() => {
                    //console.log("[DOOR] Press started:", door.id);
                    longPressedDoorId.current = null;
                  }}
                  onLongPress={() => handleDoorLongPress(door.id)}
                  onPressOut={() => handleDoorPressOut(door.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t("holdToOpenDoor")} ${door.name}`}
                  accessibilityHint={t("holdToOpenHint")}
                >
                  <View style={styles.doorTileImageArea}>
                    {door.imageBase64 ? (
                      <Image
                        source={{
                          uri: `data:image/jpeg;base64,${door.imageBase64}`,
                        }}
                        style={styles.doorTileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.doorTilePlaceholder}>
                        <Text style={styles.doorTileGlyph}>⌂</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.doorTileNameContainer}>
                    <Text style={styles.doorTileName} numberOfLines={1}>
                      {door.name}
                    </Text>
                    <Text style={styles.doorTileHoldHint}>{t("holdToOpen")}</Text>
                  </View>
                </Pressable>
                </Animated.View>
              ))}
            </View>
          )}

          <Text style={styles.footer}>SMART HOME • SECURE ACCESS</Text>
        </ScrollView>

        <View style={styles.bottomActionBar}>
          <TouchableOpacity
            style={styles.addDoorButton}
            onPress={() => setAddDoorVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.addDoorPlus}>＋</Text>
            <Text style={styles.addDoorText}>{t("addDoor")}</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={addDoorVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAddDoorVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{t("addNewDoor")}</Text>
              <Text style={styles.modalDescription}>
                {t("chooseDoorName")}
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder={t("doorNamePlaceholder")}
                placeholderTextColor="#8290A5"
                value={newDoorName}
                onChangeText={setNewDoorName}
                autoFocus
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={handleAddDoor}
              />

              <TouchableOpacity
                style={[
                  styles.modalPrimaryButton,
                  addingDoor && styles.buttonDisabled,
                ]}
                onPress={handleAddDoor}
                disabled={addingDoor}
              >
                {addingDoor ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalPrimaryText}>{t("createDoor")}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setAddDoorVisible(false);
                  setNewDoorName("");
                }}
                disabled={addingDoor}
              >
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  }

  // ============================
  // LOGIN / REGISTER
  // ============================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content"/>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.authContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>⌂</Text>
            <Text style={styles.brand}>SMART HOME</Text>
            <Text style={styles.subtitle}>{t("tagline")}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.title}>
              {screen === "login" ? t("welcomeBack") : t("createAccount")}
            </Text>
            <Text style={styles.description}>
              {screen === "login"
                ? t("signInDescription")
                : t("registerDescription")}
            </Text>

            {screen === "register" && (
              <>
                <Text style={styles.inputLabel}>{t("fullName")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("yourName")}
                  placeholderTextColor="#8290A5"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={styles.inputLabel}>{t("emailAddress")}</Text>
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#8290A5"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>{t("password")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("enterPassword")}
              placeholderTextColor="#8290A5"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {screen === "register" && (
              <>
                <Text style={styles.inputLabel}>{t("confirmPassword")}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t("confirmYourPassword")}
                  placeholderTextColor="#8290A5"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            )}

            {screen === "login" && (
              <TouchableOpacity
                style={styles.forgotContainer}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgot}>{t("forgotPassword")}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {screen === "login" ? t("signIn") : t("createAccount").toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {screen === "login"
                  ? t("noAccount")
                  : t("haveAccount")}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setScreen(screen === "login" ? "register" : "login")
                }
              >
                <Text style={styles.switchLink}>
                  {screen === "login" ? t("register") : t("signIn")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.footer}>SMART HOME • SECURE ACCESS</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#101827" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#101827",
    justifyContent: "center",
    alignItems: "center",
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingVertical: 40,
  },
  logoContainer: { alignItems: "center", marginBottom: 35 },
  logo: { fontSize: 70, color: "#5B9BFF", fontWeight: "300" },
  brand: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: 4,
  },
  subtitle: { color: "#8290A5", fontSize: 14, marginTop: 9 },
  formCard: { backgroundColor: "#1B2739", borderRadius: 22, padding: 24 },
  title: { color: "#FFFFFF", fontSize: 27, fontWeight: "700" },
  description: {
    color: "#8290A5",
    fontSize: 14,
    marginTop: 9,
    marginBottom: 27,
  },
  inputLabel: {
    color: "#A9B7CC",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 9,
    marginTop: 16,
  },
  input: {
    height: 53,
    backgroundColor: "#253349",
    borderRadius: 12,
    paddingHorizontal: 15,
    color: "#FFFFFF",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#34445D",
  },
  forgotContainer: { alignItems: "flex-end", marginTop: 14 },
  forgot: { color: "#70A9FF", fontSize: 13 },
  primaryButton: {
    height: 55,
    backgroundColor: "#397FE8",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 14,
  },
  buttonDisabled: { opacity: 0.6 },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },
  switchText: { color: "#8290A5", fontSize: 13 },
  switchLink: { color: "#70A9FF", fontSize: 13, fontWeight: "700" },
  dashboardScroll: { flex: 1 },
  dashboard: {
    flexGrow: 1,
    padding: 22,
    paddingTop: 35,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 35,
  },
  profileIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#253B59",
    borderWidth: 1,
    borderColor: "#397FE8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  profileIconHead: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    marginBottom: 3,
  },
  profileIconBody: {
    width: 21,
    height: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    backgroundColor: "#FFFFFF",
  },
  welcome: { color: "#FFFFFF", fontSize: 15, marginTop: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2,
  },
  doorInstruction: {
    color: "#70A9FF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: -7,
    marginBottom: 14,
  },
  doorCount: {
    color: "#8290A5",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  emptyState: {
    minHeight: 230,
    backgroundColor: "#1B2739",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: 25,
  },
  emptyHomeIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#253B59",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  emptyHomeGlyph: { color: "#70A9FF", fontSize: 49, lineHeight: 58 },
  emptyTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  emptyDescription: {
    color: "#8290A5",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  doorGrid: {
    flexDirection: "column",
    width: "100%",
    gap: 14,
  },
  doorTileFrame: {
    width: "100%",
    borderRadius: 18,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
  },
  doorTile: {
    width: "100%",
    height: 300,
    backgroundColor: "#1B2739",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#293B55",
  },
  doorTileImageArea: {
    width: "100%",
    height: 245,
    alignSelf: "stretch",
    backgroundColor: "#253B59",
    alignItems: "stretch",
    justifyContent: "flex-start",
    overflow: "hidden",
    position: "relative",
  },
  doorTileImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  } as ImageStyle,
  doorTilePlaceholder: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  doorTileGlyph: {
    color: "#70A9FF",
    fontSize: 48,
    lineHeight: 56,
  },
  doorTileNameContainer: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1B2739",
  },
  doorTileName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 10,
  },
  doorTileHoldHint: {
    color: "#70A9FF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  bottomActionBar: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: "#101827",
    borderTopWidth: 1,
    borderTopColor: "#253349",
  },
  addDoorButton: {
    minHeight: 55,
    backgroundColor: "#397FE8",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 0,
  },
  addDoorPlus: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "400",
    marginRight: 8,
  },
  addDoorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  footer: {
    color: "#58677D",
    textAlign: "center",
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 30,
    marginBottom: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#1B2739",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#34445D",
  },
  modalTitle: { color: "#FFFFFF", fontSize: 21, fontWeight: "800" },
  modalDescription: {
    color: "#8290A5",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 20,
  },
  modalInput: {
    height: 52,
    backgroundColor: "#253349",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#34445D",
    paddingHorizontal: 14,
    color: "#FFFFFF",
    fontSize: 14,
  },
  modalPrimaryButton: {
    height: 52,
    backgroundColor: "#397FE8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  modalPrimaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  modalCancelButton: { alignItems: "center", paddingVertical: 15 },
  modalCancelText: {
    color: "#A9B7CC",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
