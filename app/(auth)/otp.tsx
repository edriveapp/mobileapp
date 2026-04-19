import { useAuthStore } from "@/app/stores/authStore";
import { UserRole } from "@/app/types";
import { COLORS, Fonts, SPACING } from "@/constants/theme";
import Feather from "@expo/vector-icons/Feather";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Vibration,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { name, email, phoneNumber, password, role } = params;
  const displayEmail = (email as string) || '';
  const insets = useSafeAreaInsets();

  const verifyOtp = useAuthStore((state) => state.verifyOtp);
  const sendOtp = useAuthStore((state) => state.sendOtp);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isError, setIsError] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const getMaskedPhone = () => {
    const phone = (phoneNumber as string) || "";
    if (phone.length < 4) return phone;
    const last4 = phone.slice(-4);
    const prefix = phone.slice(0, Math.min(4, phone.length - 4));
    const masked = "*".repeat(Math.max(0, phone.length - 4 - prefix.length));
    return `${prefix}${masked}${last4}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    setIsError(false);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    } else if (value && index === 3) {
      const fullOtp = newOtp.join("");
      if (fullOtp.length === 4) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleBackspace = (key: string, index: number) => {
    setIsError(false);
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    try {
      await sendOtp(email as string);
      setResendTimer(60);
      setCanResend(false);
      Alert.alert("OTP Resent", "A new verification code has been sent to your phone.");
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to resend OTP. Please try again.";
      Alert.alert("Error", msg);
    }
  };

  const handleVerify = async (otpString: string) => {
    if (otpString.length !== 4) return;

    if (!name || !email || !phoneNumber || !password || !role) {
      Alert.alert("Error", "Missing signup information. Please try signing up again.");
      router.back();
      return;
    }

    try {
      const userRole: UserRole = role as UserRole;
      const userData = {
        firstName: name,
        email,
        phone: phoneNumber,
        passwordHash: password,
        role: userRole,
      };

      await verifyOtp(otpString, userData);

      if (userRole === "driver") {
        router.replace("/(driver)");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error: any) {
      setIsError(true);
      Vibration.vibrate();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Verify number</Text>
          </View>
          <TouchableOpacity style={styles.helpButton}>
            <Feather name="headphones" size={14} color="black" />
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Confirm OTP</Text>
          <Text style={styles.subtitle}>
            We sent a 4-digit code to{" "}
            <Text style={styles.phoneHighlight}>{displayEmail}</Text>
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                  isError ? styles.otpInputError : null,
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleBackspace(nativeEvent.key, index)}
                keyboardType="numeric"
                maxLength={1}
                editable={!isLoading}
                ref={(ref) => { inputs.current[index] = ref; }}
              />
            ))}
          </View>

          <View style={styles.resendRow}>
            {isLoading ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                {canResend ? (
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={styles.resendLink}>Resend Code</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
                )}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffff",
  },
  flex: {
    flex: 1,
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
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: SPACING.l,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: 27,
    fontWeight: "400",
    color: COLORS.text,
    fontFamily: Fonts.rounded,
    marginBottom: 8,
    letterSpacing: -1.0,
  },
  subtitle: {
    fontSize: 16,
    color: "#6e6e6e",
    fontFamily: Fonts.rounded,
    marginBottom: 40,
    textAlign: "center",
  },
  phoneHighlight: {
    fontWeight: "600",
    color: COLORS.text,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "70%",
    marginBottom: 24,
  },
  otpInput: {
    width: 55,
    height: 60,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "#e9e9e9",
    borderRadius: 14,
    fontSize: 22,
    paddingVertical: 0,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#FAFAFA",
    fontFamily: Fonts.rounded,
    color: COLORS.text,
    fontWeight: "600",
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: "#e6ece6",
  },
  otpInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  resendText: {
    fontSize: 14,
    color: "#6e6e6e",
    fontFamily: Fonts.rounded,
  },
  resendLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
    fontFamily: Fonts.rounded,
    textDecorationLine: "underline",
  },
  resendTimer: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "500",
    fontFamily: Fonts.rounded,
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginTop: SPACING.m,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: Fonts.semibold,
  },
});
