
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TranslationKey, useLanguage } from "@/context/LanguageContext";
import { encode } from "base-64";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { onValue, ref, remove, update } from "firebase/database";
import { BleManager, Device } from "react-native-ble-plx";
import { auth, database } from "../../firebaseConfig";
import { logoutUser } from "../../Services/authService";

// BLE UUIDs must match the ESP32 firmware.
const WIFI_BLE_SERVICE_UUID =
  "7f510001-1b15-4f0f-9d3a-7c6e5b4a3210";

const WIFI_BLE_CHARACTERISTIC_UUID =
  "7f510002-1b15-4f0f-9d3a-7c6e5b4a3210";

type Door = {
  id: string;
  name: string;
  imageBase64?: string;
};

export default function ProfileScreen() {
  const { language, setLanguage, t } = useLanguage();

  const router = useRouter();
  const user = auth.currentUser;

  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const [doors, setDoors] = useState<Door[]>([]);
  const [doorsLoading, setDoorsLoading] = useState(true);
  const [uploadingDoorId, setUploadingDoorId] = useState<string | null>(null);

  const [editingDoor, setEditingDoor] = useState<Door | null>(null);
  const [editedDoorName, setEditedDoorName] = useState("");
  const [savingDoorName, setSavingDoorName] = useState(false);

  // BLE Wi-Fi provisioning state
  const bleManagerRef = useRef<BleManager | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [wifiModalVisible, setWifiModalVisible] = useState(false);
  const [wifiSSID, setWifiSSID] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showWifiPassword, setShowWifiPassword] = useState(false);

  const [nearbyDevices, setNearbyDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const [scanningDevices, setScanningDevices] = useState(false);
  const [sendingCredentials, setSendingCredentials] = useState(false);

  // Translate dynamic messages using {name}.
  const translateName = (key: TranslationKey, name: string) =>
    t(key).replace("{name}", name);

  // BLE manager lifecycle
  useEffect(() => {
    const manager = new BleManager();
    bleManagerRef.current = manager;

    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      manager.stopDeviceScan();
      manager.destroy();
      bleManagerRef.current = null;
    };
  }, []);

  function openWifiConfiguration() {
    setWifiModalVisible(true);
    setNearbyDevices([]);
    setSelectedDevice(null);
    setWifiSSID("");
    setWifiPassword("");
    setShowWifiPassword(false);
  }

  async function requestBlePermissions() {
    if (Platform.OS !== "android") return true;

    const apiLevel = Number(Platform.Version);

    const permissions =
      apiLevel >= 31
        ? [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

    const results = await PermissionsAndroid.requestMultiple(permissions);

    return permissions.every(
      (permission) =>
        results[permission] === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  async function scanForControllers() {
    const manager = bleManagerRef.current;

    if (!manager || scanningDevices) return;

    try {
      const permissionsGranted = await requestBlePermissions();

      if (!permissionsGranted) {
        Alert.alert(
          t("permissionRequired"),
          t("bluetoothPermissionMessage")
        );
        return;
      }

      const bluetoothState = await manager.state();

      if (bluetoothState !== "PoweredOn") {
        Alert.alert(
          t("bluetoothUnavailable"),
          t("enableBluetoothMessage")
        );
        return;
      }

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      manager.stopDeviceScan();

      setNearbyDevices([]);
      setSelectedDevice(null);
      setScanningDevices(true);

      manager.startDeviceScan(
        [WIFI_BLE_SERVICE_UUID],
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            manager.stopDeviceScan();
            setScanningDevices(false);

            Alert.alert(
              t("bluetoothScanError"),
              error.message
            );
            return;
          }

          if (device) {
            setNearbyDevices((current) => {
              if (current.some((item) => item.id === device.id)) {
                return current;
              }

              return [...current, device];
            });
          }
        }
      );

      scanTimeoutRef.current = setTimeout(() => {
        manager.stopDeviceScan();
        setScanningDevices(false);
      }, 12000);
    } catch (error: any) {
      setScanningDevices(false);

      Alert.alert(
        t("bluetoothError"),
        error?.message || t("unableScan")
      );
    }
  }

  async function sendWifiCredentials() {
    const manager = bleManagerRef.current;
    const ssid = wifiSSID.trim();

    if (!selectedDevice) {
      Alert.alert(
        t("controllerRequired"),
        t("selectControllerMessage")
      );
      return;
    }

    if (!ssid) {
      Alert.alert(
        t("ssidRequired"),
        t("enterWifiName")
      );
      return;
    }

    if (!manager || sendingCredentials) return;

    let connectedDevice: Device | null = null;

    try {
      setSendingCredentials(true);

      connectedDevice = await manager.connectToDevice(
        selectedDevice.id,
        { timeout: 15000 }
      );

      await connectedDevice.discoverAllServicesAndCharacteristics();

      const payload = encode(
        JSON.stringify({
          type: "wifi_credentials",
          ssid,
          password: wifiPassword,
        })
      );

      await connectedDevice.writeCharacteristicWithResponseForService(
        WIFI_BLE_SERVICE_UUID,
        WIFI_BLE_CHARACTERISTIC_UUID,
        payload
      );

      Alert.alert(
        t("credentialsSent"),
        t("credentialsSentMessage")
      );

      setWifiModalVisible(false);
      setWifiPassword("");
    } catch (error: any) {
      Alert.alert(
        t("configurationFailed"),
        error?.message || t("configurationFailedMessage")
      );
    } finally {
      if (connectedDevice) {
        try {
          await connectedDevice.cancelConnection();
        } catch {
          // The ESP32 may already have disconnected.
        }
      }

      setSendingCredentials(false);
    }
  }

  // Firebase doors listener
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
          const parsed = Object.entries(
            data as Record<string, any>
          )
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

          setDoors(parsed);
        }

        setDoorsLoading(false);
      },
      (error) => {
        console.error("Profile doors listener:", error.message);

        setDoorsLoading(false);

        Alert.alert(
          t("databaseError"),
          t("unableLoadDoors")
        );
      }
    );

    return unsubscribe;
  }, [user?.uid, language]);

  // Choose and upload a door image
  async function handleChooseDoorImage(door: Door) {
    if (!user || uploadingDoorId !== null) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("permissionRequired"),
          t("photoPermissionMessage")
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setUploadingDoorId(door.id);

      const processedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 300 } }],
        {
          compress: 0.55,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (!processedImage.base64) {
        throw new Error("Could not process the selected image.");
      }

      await update(
        ref(database, `doors/${user.uid}/${door.id}`),
        {
          imageBase64: processedImage.base64,
        }
      );

      Alert.alert(
        t("imageUpdated"),
        translateName("imageUpdatedMessage", door.name)
      );
    } catch (error: any) {
      console.error("Door image error:", error);

      Alert.alert(
        t("unableUpdateImage"),
        error?.message || t("tryAgain")
      );
    } finally {
      setUploadingDoorId(null);
    }
  }

  function openRenameDoor(door: Door) {
    setEditingDoor(door);
    setEditedDoorName(door.name);
  }

  async function handleRenameDoor() {
    if (!user || !editingDoor) return;

    const trimmedName = editedDoorName.trim();

    if (!trimmedName) {
      Alert.alert(
        t("nameRequired"),
        t("enterDoorName")
      );
      return;
    }

    try {
      setSavingDoorName(true);

      await update(
        ref(database, `doors/${user.uid}/${editingDoor.id}`),
        { name: trimmedName }
      );

      setEditingDoor(null);
      setEditedDoorName("");
    } catch (error: any) {
      Alert.alert(
        t("unableRename"),
        error?.message || t("tryAgain")
      );
    } finally {
      setSavingDoorName(false);
    }
  }

  function handleDeleteDoor(door: Door) {
    if (!user) return;

    Alert.alert(
      t("deleteDoorTitle"),
      translateName("deleteDoorMessage", door.name),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await remove(
                ref(database, `doors/${user.uid}/${door.id}`)
              );
            } catch (error: any) {
              Alert.alert(
                t("unableDelete"),
                error?.message || t("tryAgain")
              );
            }
          },
        },
      ]
    );
  }

  async function handleLogout() {
    try {
      await logoutUser();
      router.replace("/");
    } catch (error: any) {
      Alert.alert(
        t("logoutError"),
        error?.message || t("unableLogout")
      );
    }
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />

        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5B9BFF" />
          <Text style={styles.muted}>
            {t("loadingProfile")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString(
        language === "fr" ? "fr-FR" : "en-US"
      )
    : t("notAvailable");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.backText}>
                ‹  {t("back")}
              </Text>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={openWifiConfiguration}
                style={styles.wifiHeaderButton}
                activeOpacity={0.85}
              >
                <Text style={styles.wifiHeaderButtonText}>
                  ⌁  {t("wifi")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setLanguageModalVisible(true)}
                style={styles.languageHeaderButton}
                activeOpacity={0.85}
              >
                <Text style={styles.wifiHeaderButtonText}>
                  🌐 {language.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.title}>
            {t("myProfile")}
          </Text>

          <Text style={styles.subtitle}>
            {t("accountInformation")}
          </Text>
        </View>

        {/* USER INFORMATION */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user.displayName || user.email || "U")
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <Text style={styles.name}>
          {user.displayName || t("defaultUser")}
        </Text>

        <Text style={styles.email}>
          {user.email || t("noEmail")}
        </Text>

        <View style={styles.card}>
          <ProfileItem
            label={t("fullName")}
            value={user.displayName || t("notProvided")}
          />

          <ProfileItem
            label={t("emailAddress")}
            value={user.email || t("notAvailable")}
          />

          <ProfileItem
            label={t("accountId")}
            value={user.uid}
          />

          <ProfileItem
            label={t("accountCreated")}
            value={createdAt}
          />
        </View>

        {/* DOOR PHOTOS */}
        <Text style={styles.sectionTitle}>
          {t("doorPhotos")}
        </Text>

        <Text style={styles.sectionDescription}>
          {t("doorPhotosDescription")}
        </Text>

        {doorsLoading ? (
          <View style={styles.loadingDoors}>
            <ActivityIndicator size="large" color="#5B9BFF" />
          </View>
        ) : doors.length === 0 ? (
          <Text style={styles.muted}>
            {t("noDoors")}
          </Text>
        ) : (
          doors.map((door) => (
            <View key={door.id} style={styles.doorPhotoCard}>
              <TouchableOpacity
                style={styles.doorImageButton}
                onPress={() => handleChooseDoorImage(door)}
                disabled={uploadingDoorId !== null}
                activeOpacity={0.85}
              >
                {uploadingDoorId === door.id ? (
                  <ActivityIndicator
                    size="large"
                    color="#FFFFFF"
                  />
                ) : door.imageBase64 ? (
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${door.imageBase64}`,
                    }}
                    style={styles.doorImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderIcon}>＋</Text>
                    <Text style={styles.placeholderText}>
                      {t("addPhoto")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.doorPhotoFooter}>
                <View style={styles.doorPhotoTitleBlock}>
                  <Text style={styles.doorPhotoName}>
                    {door.name}
                  </Text>

                  <Text style={styles.changePhotoText}>
                    {door.imageBase64
                      ? t("tapChangePhoto")
                      : t("tapAddPhoto")}
                  </Text>
                </View>

                <View style={styles.doorActions}>
                  <TouchableOpacity
                    style={styles.editDoorButton}
                    onPress={() => openRenameDoor(door)}
                  >
                    <Text style={styles.editDoorText}>
                      {t("editName")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteDoorButton}
                    onPress={() => handleDeleteDoor(door)}
                  >
                    <Text style={styles.deleteDoorText}>
                      {t("delete")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        {/* LANGUAGE MODAL */}
        <Modal
          visible={languageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setLanguageModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {t("chooseLanguage")}
              </Text>

              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === "en" && styles.languageOptionSelected,
                ]}
                onPress={() => {
                  void setLanguage("en");
                  setLanguageModalVisible(false);
                }}
              >
                <Text style={styles.languageOptionText}>
                  🇬🇧 English
                </Text>

                <Text style={styles.languageCheck}>
                  {language === "en" ? "✓" : ""}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageOption,
                  language === "fr" && styles.languageOptionSelected,
                ]}
                onPress={() => {
                  void setLanguage("fr");
                  setLanguageModalVisible(false);
                }}
              >
                <Text style={styles.languageOptionText}>
                  🇫🇷 Français
                </Text>

                <Text style={styles.languageCheck}>
                  {language === "fr" ? "✓" : ""}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelNameButton}
                onPress={() => setLanguageModalVisible(false)}
              >
                <Text style={styles.cancelNameText}>
                  {t("close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* RENAME DOOR MODAL */}
        <Modal
          visible={editingDoor !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setEditingDoor(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {t("renameDoor")}
              </Text>

              <TextInput
                style={styles.modalInput}
                value={editedDoorName}
                onChangeText={setEditedDoorName}
                placeholder={t("doorName")}
                placeholderTextColor="#8290A5"
                maxLength={40}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleRenameDoor}
              />

              <TouchableOpacity
                style={[
                  styles.saveNameButton,
                  savingDoorName && styles.buttonDisabled,
                ]}
                onPress={handleRenameDoor}
                disabled={savingDoorName}
              >
                {savingDoorName ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveNameText}>
                    {t("saveName")}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelNameButton}
                onPress={() => setEditingDoor(null)}
                disabled={savingDoorName}
              >
                <Text style={styles.cancelNameText}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* WI-FI CONFIGURATION MODAL */}
        <Modal
          visible={wifiModalVisible}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => {
            if (!sendingCredentials) {
              setWifiModalVisible(false);
            }
          }}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.wifiModalScroll}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                  {t("configureWifi")}
                </Text>

                <Text style={styles.wifiModalDescription}>
                  {t("wifiDescription")}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.scanButton,
                    scanningDevices && styles.buttonDisabled,
                  ]}
                  onPress={scanForControllers}
                  disabled={scanningDevices || sendingCredentials}
                >
                  {scanningDevices ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.scanButtonText}>
                      {t("scanControllers")}
                    </Text>
                  )}
                </TouchableOpacity>

                {scanningDevices && (
                  <Text style={styles.wifiHint}>
                    {t("scanning")}
                  </Text>
                )}

                {nearbyDevices.length > 0 && (
                  <View style={styles.deviceList}>
                    <Text style={styles.wifiFieldLabel}>
                      {t("nearbyControllers")}
                    </Text>

                    {nearbyDevices.map((device) => {
                      const selected =
                        selectedDevice?.id === device.id;

                      return (
                        <TouchableOpacity
                          key={device.id}
                          style={[
                            styles.deviceRow,
                            selected && styles.deviceRowSelected,
                          ]}
                          onPress={() => setSelectedDevice(device)}
                        >
                          <View style={styles.deviceTextBlock}>
                            <Text style={styles.deviceName}>
                              {device.name ||
                                device.localName ||
                                t("esp32Controller")}
                            </Text>

                            <Text style={styles.deviceId}>
                              {device.id}
                            </Text>
                          </View>

                          <Text style={styles.deviceSelectText}>
                            {selected ? t("selected") : t("select")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.wifiFieldLabel}>
                  {t("wifiNetworkName")}
                </Text>

                <TextInput
                  style={styles.modalInput}
                  value={wifiSSID}
                  onChangeText={setWifiSSID}
                  placeholder={t("enterWifiNamePlaceholder")}
                  placeholderTextColor="#8290A5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={32}
                />

                <Text style={styles.wifiFieldLabel}>
                  {t("wifiPassword")}
                </Text>

                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={wifiPassword}
                    onChangeText={setWifiPassword}
                    placeholder={t("enterWifiPassword")}
                    placeholderTextColor="#8290A5"
                    secureTextEntry={!showWifiPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={64}
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowWifiPassword((value) => !value)
                    }
                    style={styles.showPasswordButton}
                  >
                    <Text style={styles.showPasswordText}>
                      {showWifiPassword ? t("hide") : t("show")}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveNameButton,
                    sendingCredentials && styles.buttonDisabled,
                  ]}
                  onPress={sendWifiCredentials}
                  disabled={sendingCredentials}
                >
                  {sendingCredentials ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveNameText}>
                      {t("sendCredentials")}
                    </Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.wifiSecurityNote}>
                  {t("wifiSecurityNote")}
                </Text>

                <TouchableOpacity
                  style={styles.cancelNameButton}
                  onPress={() => setWifiModalVisible(false)}
                  disabled={sendingCredentials}
                >
                  <Text style={styles.cancelNameText}>
                    {t("close")}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* LOGOUT */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutText}>
            {t("logout")}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.item}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101827",
  },

  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    marginBottom: 28,
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },

  backText: {
    color: "#70A9FF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },

  wifiHeaderButton: {
    backgroundColor: "#203B5D",
    borderWidth: 1,
    borderColor: "#397FE8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  languageHeaderButton: {
    backgroundColor: "#203B5D",
    borderWidth: 1,
    borderColor: "#397FE8",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },

  wifiHeaderButtonText: {
    color: "#A9CCFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 2,
  },

  subtitle: {
    color: "#8290A5",
    fontSize: 14,
    marginTop: 7,
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#397FE8",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "800",
  },

  name: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 14,
  },

  email: {
    color: "#8290A5",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 28,
  },

  card: {
    backgroundColor: "#1B2739",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  item: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#34445D",
  },

  label: {
    color: "#8290A5",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 7,
  },

  value: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  muted: {
    color: "#8290A5",
    marginTop: 12,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 28,
  },

  sectionDescription: {
    color: "#8290A5",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 14,
  },

  loadingDoors: {
    padding: 25,
    alignItems: "center",
  },

  doorPhotoCard: {
    backgroundColor: "#1B2739",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#293B55",
  },

  doorImageButton: {
    height: 190,
    width: "100%",
    backgroundColor: "#253B59",
    alignItems: "center",
    justifyContent: "center",
  },

  doorImage: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderIcon: {
    color: "#70A9FF",
    fontSize: 42,
  },

  placeholderText: {
    color: "#8290A5",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginTop: 4,
  },

  doorPhotoFooter: {
    minHeight: 52,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  doorPhotoTitleBlock: {
    flex: 1,
    paddingVertical: 10,
  },

  doorPhotoName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  doorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    marginLeft: 8,
  },

  editDoorButton: {
    backgroundColor: "#294B76",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  editDoorText: {
    color: "#A9CCFF",
    fontSize: 10,
    fontWeight: "800",
  },

  deleteDoorButton: {
    backgroundColor: "#4A252B",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  deleteDoorText: {
    color: "#FF9A9A",
    fontSize: 10,
    fontWeight: "800",
  },

  changePhotoText: {
    color: "#70A9FF",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 8,
  },

  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#253349",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#34445D",
    marginTop: 12,
  },

  languageOptionSelected: {
    borderColor: "#5B9BFF",
    backgroundColor: "#203B5D",
  },

  languageOptionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  languageCheck: {
    color: "#70A9FF",
    fontSize: 18,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  wifiModalScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 35,
    paddingBottom: 50,
  },

  modalCard: {
    backgroundColor: "#1B2739",
    borderRadius: 18,
    padding: 22,
    marginVertical: 10,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 16,
  },

  modalInput: {
    backgroundColor: "#101827",
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#34445D",
    borderRadius: 11,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 14,
  },

  wifiModalDescription: {
    color: "#8290A5",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -6,
    marginBottom: 18,
  },

  scanButton: {
    backgroundColor: "#294B76",
    borderRadius: 11,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  scanButtonText: {
    color: "#A9CCFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  wifiHint: {
    color: "#8290A5",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 12,
  },

  deviceList: {
    marginBottom: 16,
  },

  wifiFieldLabel: {
    color: "#A9B7CC",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 10,
  },

  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#101827",
    borderWidth: 1,
    borderColor: "#34445D",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },

  deviceRowSelected: {
    borderColor: "#5B9BFF",
    backgroundColor: "#1C3554",
  },

  deviceTextBlock: {
    flex: 1,
    marginRight: 10,
  },

  deviceName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  deviceId: {
    color: "#8290A5",
    fontSize: 9,
    marginTop: 4,
  },

  deviceSelectText: {
    color: "#70A9FF",
    fontSize: 9,
    fontWeight: "800",
  },

  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#101827",
    borderWidth: 1,
    borderColor: "#34445D",
    borderRadius: 11,
    marginBottom: 20,
    minHeight: 54,
  },

  passwordInput: {
    flex: 1,
    color: "#FFFFFF",
    paddingHorizontal: 14,
    height: 50,
  },

  showPasswordButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  showPasswordText: {
    color: "#70A9FF",
    fontSize: 10,
    fontWeight: "800",
  },

  wifiSecurityNote: {
    color: "#8290A5",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 14,
    textAlign: "center",
  },

  saveNameButton: {
    backgroundColor: "#397FE8",
    borderRadius: 11,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  saveNameText: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 1,
  },

  cancelNameButton: {
    alignItems: "center",
    padding: 14,
  },

  cancelNameText: {
    color: "#8290A5",
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  logoutButton: {
    backgroundColor: "#D92D20",
    borderRadius: 13,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});
