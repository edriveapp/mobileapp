import { useAuthStore } from "@/app/stores/authStore";
import { UserRole } from "@/app/types";
import { COLORS, Fonts, SPACING } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { Link, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardSafeView from "../components/KeyboardSafeView";

export default function SignupScreen() {
  const router = useRouter();
  const isLoading = useAuthStore((state) => state.isLoading);
  const sendOtp = useAuthStore((state) => state.sendOtp);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDriver, setIsDriver] = useState(false);
  const [isDriverToggling, setIsDriverToggling] = useState(false);

  const toggleDriverRole = () => {
    if (isDriverToggling) return;
    setIsDriverToggling(true);
    setTimeout(() => {
      setIsDriver((prev) => !prev);
      setIsDriverToggling(false);
    }, 400);
  };

  const handleSignup = async () => {
    if (!name || !email || !phoneNumber || !password || !confirmPassword) {
      Alert.alert("Haa!", "Please fill in all fields");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Oh no!", "Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Oh no!", "Passwords do not match");
      return;
    }

    let formattedPhone = phoneNumber.replace(/[^0-9+]/g, '');
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+234" + formattedPhone.replace(/^0+/, "");
    }

    const role: UserRole = isDriver ? "driver" : "passenger";

    try {
      await sendOtp(email);

      router.push({
        pathname: "/(auth)/otp",
        params: {
          name,
          email,
          phoneNumber: formattedPhone,
          password,
          role,
        },
      });
    } catch (error: any) {
      console.error("Signup OTP error:", error);
      const msg =
        error.response?.data?.message ||
        (error.message?.toLowerCase().includes("timeout")
          ? "Connection timed out. Please check your network and try again."
          : error.message) ||
        "Failed to send verification code";
      Alert.alert("Error", msg);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <KeyboardSafeView>
        <View style={styles.header}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Create an account</Text>
          </View>
          <TouchableOpacity style={styles.helpButton}>
            <Feather name="headphones" size={14} color="black" />
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            Create {isDriver ? "a driver" : "an edrive"} account
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>I have an edrive account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.subtitleLink}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="+234 701 234 5671"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            {password.length > 0 && password.length < 8 && (
              <Text style={styles.errorText}>8 characters minimum</Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter Password Again"
                placeholderTextColor={COLORS.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Feather
                  name={showConfirmPassword ? "eye" : "eye-off"}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardSafeView>

      {/* CTA pinned at bottom — outside KeyboardSafeView so it never shifts */}
      <View style={[styles.bottomWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleSignup}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isDriver ? "switch to user?" : "want to become a driver?"}
          </Text>
          <TouchableOpacity
            onPress={toggleDriverRole}
            activeOpacity={0.8}
            disabled={isDriverToggling || isLoading}
          >
            {isDriverToggling ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Text style={styles.link}>
                {isDriver ? "Switch to edrive" : "Create account"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  tag: {
    backgroundColor: "#bdf7db",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 13,
  },
  tagText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "500",
    fontFamily: Fonts.rounded,
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 4,
    paddingHorizontal: 13,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
    fontFamily: Fonts.rounded,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 27,
    fontWeight: "400",
    color: COLORS.text,
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    letterSpacing: -1.0,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    letterSpacing: -0.5,
    fontFamily: Fonts.rounded,
    fontWeight: "400",
    lineHeight: 18,
  },
  subtitleLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.text,
    marginBottom: 3,
    fontFamily: Fonts.rounded,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.m,
    height: 45,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontFamily: Fonts.rounded,
  },
  bottomWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Fonts.semibold,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 13,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: Fonts.rounded,
    marginRight: 4,
  },
  link: {
    color: COLORS.primary,
    fontWeight: "bold",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Fonts.rounded,
    marginLeft: 4,
  },
});
