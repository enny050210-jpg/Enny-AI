import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const COLORS = {
  navy: "#101A3A", blue: "#4169F5", purple: "#8055E8",
  pale: "#F3F5FF", white: "#FFFFFF", ink: "#17213D",
  muted: "#74809C", border: "#E1E6F2", green: "#16865B"
};

const CATEGORIES = ["Portrait", "Fashion", "Business", "Product", "Logo", "Food", "Real estate", "Social media"];
const STYLES = ["Photorealistic", "Cinematic", "Luxury editorial", "3D render", "Minimalist", "Anime", "Documentary"];
const LIGHTING = ["Soft natural light", "Golden hour", "Studio softbox", "Dramatic cinematic light", "Bright commercial light", "Neon lighting"];
const CAMERAS = ["85mm portrait lens", "50mm standard lens", "35mm environmental lens", "Macro close-up", "Wide-angle lens", "Top-down view"];
const QUALITIES = ["High detail, realistic textures", "4K UHD", "8K ultra-detailed", "Clean professional finish"];

function buildPrompt(data) {
  const subject = data.subject.trim() || "A professional creative subject";
  const parts = [
    `Create a ${data.style.toLowerCase()} ${data.category.toLowerCase()} image featuring ${subject}.`,
    data.setting.trim() ? `Setting and background: ${data.setting.trim()}.` : "",
    `Lighting: ${data.lighting.toLowerCase()}.`,
    `Camera and composition: ${data.camera.toLowerCase()}, carefully composed framing, clear focal subject.`,
    `Visual quality: ${data.quality.toLowerCase()}, balanced colours, refined details.`,
    data.extra.trim() ? `Additional direction: ${data.extra.trim()}.` : "",
    "Keep the image visually coherent, with natural proportions, realistic details where applicable, and no unnecessary text or watermarks."
  ];
  return parts.filter(Boolean).join(" ");
}

function PrimaryButton({ title, onPress, disabled, secondary }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85}
      style={[styles.button, secondary && styles.secondaryButton, disabled && { opacity: 0.5 }]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, placeholder, multiline }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA4BA"
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

function ChoiceRow({ label, options, value, onChange }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {options.map(option => (
          <TouchableOpacity key={option} onPress={() => onChange(option)}
            style={[styles.chip, value === option && styles.chipSelected]}>
            <Text style={[styles.chipText, value === option && styles.chipTextSelected]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState("generator");
  const [history, setHistory] = useState([]);
  const [generated, setGenerated] = useState("");
  const [form, setForm] = useState({
    category: "Portrait",
    subject: "",
    style: "Photorealistic",
    setting: "",
    lighting: "Soft natural light",
    camera: "85mm portrait lens",
    quality: "4K UHD",
    extra: ""
  });

  useEffect(() => {
    let subscription;
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      const result = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
      subscription = result.data.subscription;
    }
    loadHistory();
    return () => subscription?.unsubscribe();
  }, []);

  const isSignedIn = !!session || demoMode;
  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  async function loadHistory() {
    try {
      const saved = await AsyncStorage.getItem("enny_prompt_history");
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.warn("Could not load prompt history", e);
    }
  }

  async function saveHistory(prompt) {
    const item = { id: String(Date.now()), prompt, createdAt: new Date().toISOString() };
    const next = [item, ...history].slice(0, 50);
    setHistory(next);
    try { await AsyncStorage.setItem("enny_prompt_history", JSON.stringify(next)); }
    catch (e) { Alert.alert("Storage issue", "Your prompt was generated, but could not be saved."); }
  }

  async function handleAuth() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing details", "Enter your email address and password.");
      return;
    }
    if (!supabase) {
      Alert.alert(
        "Account setup required",
        "To enable real accounts, connect a Supabase project and add its URL and anon key to the .env file. You can use Demo Mode to test the prompt generator now."
      );
      return;
    }
    setBusy(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } }
        });
        if (error) throw error;
        Alert.alert("Check your email", "If email confirmation is enabled in Supabase, confirm your address before logging in.");
        setAuthMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      Alert.alert("Account error", e.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    if (supabase && session) await supabase.auth.signOut();
    setSession(null);
    setDemoMode(false);
  }

  async function generate() {
    if (!form.subject.trim()) {
      Alert.alert("Add a subject", "Describe what you want the image to show.");
      return;
    }
    const prompt = buildPrompt(form);
    setGenerated(prompt);
    await saveHistory(prompt);
    setPage("generator");
  }

  async function copyPrompt(prompt = generated) {
    if (!prompt) return;
    await Clipboard.setStringAsync(prompt);
    Alert.alert("Copied", "Your prompt has been copied to the clipboard.");
  }

  async function clearHistory() {
    Alert.alert("Clear history", "Delete all saved prompts from this device?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setHistory([]);
        await AsyncStorage.removeItem("enny_prompt_history");
      }}
    ]);
  }

  if (!isSignedIn) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.brandMark}><Text style={styles.brandMarkText}>E</Text></View>
            <Text style={styles.brandTitle}>ENNY AI</Text>
            <Text style={styles.brandSubtitle}>Your creativity, powered by AI.</Text>
            <View style={styles.authCard}>
              <Text style={styles.cardTitle}>{authMode === "signup" ? "Create your account" : "Welcome back"}</Text>
              <Text style={styles.cardSub}>Sign in to your creative workspace.</Text>
              {authMode === "signup" && <Field label="FULL NAME" value={fullName} onChangeText={setFullName} placeholder="Your name" />}
              <Field label="EMAIL ADDRESS" value={email} onChangeText={setEmail} placeholder="you@example.com" />
              <Field label="PASSWORD" value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
              <PrimaryButton title={busy ? "Please wait..." : authMode === "signup" ? "Create account" : "Log in"} onPress={handleAuth} disabled={busy} />
              <TouchableOpacity onPress={() => setAuthMode(authMode === "signup" ? "login" : "signup")} style={styles.switchAuth}>
                <Text style={styles.switchAuthText}>{authMode === "signup" ? "Already have an account? Log in" : "New to ENNY AI? Create account"}</Text>
              </TouchableOpacity>
              <View style={styles.orLine}><View style={styles.line} /><Text style={styles.orText}>OR</Text><View style={styles.line} /></View>
              <PrimaryButton title="Explore in Demo Mode" secondary onPress={() => setDemoMode(true)} />
              {!supabase && <Text style={styles.setupHint}>Real account registration becomes active after Supabase setup. Demo Mode lets you test the generator now.</Text>}
            </View>
            <Text style={styles.footerText}>ENNY AI • Version 1.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBrand}>ENNY AI</Text>
          <Text style={styles.topCaption}>Creative studio</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.profileButton}><Text style={styles.profileText}>Sign out</Text></TouchableOpacity>
      </View>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => setPage("generator")} style={[styles.navItem, page === "generator" && styles.navActive]}>
          <Text style={[styles.navText, page === "generator" && styles.navTextActive]}>Prompt studio</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setPage("history")} style={[styles.navItem, page === "history" && styles.navActive]}>
          <Text style={[styles.navText, page === "history" && styles.navTextActive]}>My prompts ({history.length})</Text>
        </TouchableOpacity>
      </View>
      {page === "generator" ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.welcome}>Turn your ideas into powerful prompts.</Text>
          <Text style={styles.intro}>Choose a category, describe your idea and customize the visual direction.</Text>
          <ChoiceRow label="1. IMAGE CATEGORY" options={CATEGORIES} value={form.category} onChange={v => update("category", v)} />
          <Field label="2. WHAT SHOULD THE IMAGE SHOW?" value={form.subject} onChangeText={v => update("subject", v)} placeholder="Example: A confident young entrepreneur in a modern office..." multiline />
          <ChoiceRow label="3. VISUAL STYLE" options={STYLES} value={form.style} onChange={v => update("style", v)} />
          <Field label="4. BACKGROUND / SETTING" value={form.setting} onChangeText={v => update("setting", v)} placeholder="Example: A clean modern studio with a soft blue background" multiline />
          <ChoiceRow label="5. LIGHTING" options={LIGHTING} value={form.lighting} onChange={v => update("lighting", v)} />
          <ChoiceRow label="6. CAMERA / COMPOSITION" options={CAMERAS} value={form.camera} onChange={v => update("camera", v)} />
          <ChoiceRow label="7. OUTPUT QUALITY" options={QUALITIES} value={form.quality} onChange={v => update("quality", v)} />
          <Field label="8. EXTRA INSTRUCTIONS (OPTIONAL)" value={form.extra} onChangeText={v => update("extra", v)} placeholder="Add clothing, colours, pose, facial identity instructions, text placement..." multiline />
          <PrimaryButton title="Generate my prompt" onPress={generate} />
          {generated ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Your generated prompt</Text>
              <Text style={styles.resultText}>{generated}</Text>
              <PrimaryButton title="Copy prompt" onPress={() => copyPrompt()} />
            </View>
          ) : null}
          <View style={styles.premiumCard}>
            <Text style={styles.premiumTitle}>ENNY AI Premium</Text>
            <Text style={styles.premiumPrice}>₦2,000 / year</Text>
            <Text style={styles.premiumInfo}>Planned premium membership. Payments and automatic activation are not connected in this prototype.</Text>
          </View>
          <Text style={styles.disclaimer}>Prompt generation currently runs on your device. It creates text prompts, it does not generate images or videos yet.</Text>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.historyHeading}>
            <View><Text style={styles.welcome}>Your saved prompts</Text><Text style={styles.intro}>Stored on this device.</Text></View>
            {history.length > 0 && <TouchableOpacity onPress={clearHistory}><Text style={styles.clearText}>Clear all</Text></TouchableOpacity>}
          </View>
          {history.length === 0 ? <Text style={styles.empty}>No saved prompts yet. Generate your first prompt in Prompt Studio.</Text> :
            history.map(item => (
              <View key={item.id} style={styles.historyCard}>
                <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                <Text style={styles.historyText}>{item.prompt}</Text>
                <TouchableOpacity onPress={() => copyPrompt(item.prompt)}><Text style={styles.copyLink}>Copy prompt</Text></TouchableOpacity>
              </View>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.pale },
  authContainer: { flexGrow: 1, backgroundColor: COLORS.navy, padding: 24, justifyContent: "center" },
  brandMark: { alignSelf: "center", width: 64, height: 64, borderRadius: 22, backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  brandMarkText: { color: "#fff", fontSize: 34, fontWeight: "900" },
  brandTitle: { color: "#fff", fontSize: 30, fontWeight: "900", textAlign: "center", letterSpacing: 2 },
  brandSubtitle: { color: "#C5D0F4", textAlign: "center", marginTop: 6, marginBottom: 26 },
  authCard: { backgroundColor: "#fff", borderRadius: 24, padding: 20 },
  cardTitle: { color: COLORS.ink, fontSize: 22, fontWeight: "800" },
  cardSub: { color: COLORS.muted, marginTop: 5, marginBottom: 16 },
  fieldWrap: { marginBottom: 17 },
  fieldLabel: { color: COLORS.ink, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 13, paddingHorizontal: 13, color: COLORS.ink, backgroundColor: "#FBFCFF", fontSize: 14 },
  multiline: { minHeight: 88, paddingTop: 12 },
  button: { minHeight: 50, borderRadius: 14, backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 5 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryButton: { backgroundColor: "#EEF1FF", borderWidth: 1, borderColor: "#D9DFFF" },
  secondaryButtonText: { color: COLORS.blue },
  switchAuth: { paddingVertical: 15, alignItems: "center" },
  switchAuthText: { color: COLORS.blue, fontWeight: "700", fontSize: 13 },
  orLine: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  line: { height: 1, backgroundColor: COLORS.border, flex: 1 },
  orText: { color: COLORS.muted, fontSize: 10, fontWeight: "700" },
  setupHint: { color: COLORS.muted, fontSize: 11, lineHeight: 16, textAlign: "center", marginTop: 12 },
  footerText: { color: "#AEBBE7", textAlign: "center", marginTop: 22, fontSize: 11 },
  topBar: { backgroundColor: COLORS.navy, paddingHorizontal: 20, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topBrand: { color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 1.4 },
  topCaption: { color: "#B9C7F3", fontSize: 11, marginTop: 2 },
  profileButton: { paddingVertical: 9, paddingHorizontal: 13, backgroundColor: "#26345F", borderRadius: 10 },
  profileText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  nav: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  navItem: { paddingVertical: 14, marginRight: 22, borderBottomWidth: 3, borderBottomColor: "transparent" },
  navActive: { borderBottomColor: COLORS.blue },
  navText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  navTextActive: { color: COLORS.blue },
  content: { padding: 18, paddingBottom: 40 },
  welcome: { color: COLORS.ink, fontSize: 23, fontWeight: "900", lineHeight: 29 },
  intro: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 22 },
  chips: { gap: 8, paddingRight: 12 },
  chip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fff", paddingVertical: 9, paddingHorizontal: 13, borderRadius: 22 },
  chipSelected: { backgroundColor: "#E9EDFF", borderColor: COLORS.blue },
  chipText: { color: COLORS.muted, fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: COLORS.blue, fontWeight: "800" },
  resultCard: { backgroundColor: "#fff", padding: 16, borderRadius: 18, marginTop: 18, borderWidth: 1, borderColor: "#DCE3FF" },
  resultTitle: { color: COLORS.ink, fontSize: 17, fontWeight: "900", marginBottom: 10 },
  resultText: { color: "#34405E", fontSize: 13, lineHeight: 21, marginBottom: 12 },
  premiumCard: { backgroundColor: COLORS.navy, padding: 18, borderRadius: 18, marginTop: 20 },
  premiumTitle: { color: "#fff", fontWeight: "800", fontSize: 16 },
  premiumPrice: { color: "#BFCBFF", fontWeight: "900", fontSize: 23, marginTop: 6 },
  premiumInfo: { color: "#D1D9F4", fontSize: 11, lineHeight: 16, marginTop: 7 },
  disclaimer: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 15, textAlign: "center" },
  historyHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clearText: { color: "#C34B57", fontWeight: "800", fontSize: 12 },
  empty: { color: COLORS.muted, textAlign: "center", marginTop: 40, lineHeight: 21 },
  historyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  historyDate: { color: COLORS.muted, fontSize: 10, marginBottom: 8 },
  historyText: { color: COLORS.ink, fontSize: 13, lineHeight: 20 },
  copyLink: { color: COLORS.blue, fontWeight: "800", marginTop: 12, fontSize: 12 }
});
