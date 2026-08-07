import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { ValidationError } from "../../utils/envValidation";

interface EnvValidationModalProps {
  visible: boolean;
  errors: ValidationError[];
  onClose?: () => void;
}

export function EnvValidationModal({ visible, errors, onClose }: EnvValidationModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <Text style={styles.iconText}>!</Text>
            </View>
            <View>
              <Text style={styles.title}>Configuration required</Text>
              <Text style={styles.subtitle}>Environment variables are missing or invalid</Text>
            </View>
          </View>

          <ScrollView style={styles.errorList}>
            {errors.map((error) => (
              <View key={error.key} style={styles.errorItem}>
                <Text style={styles.errorKey}>{error.key}</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>How to fix</Text>
            <Text style={styles.instructionsItem}>
              1. Create <Text style={styles.code}>.env.local</Text> from{" "}
              <Text style={styles.code}>.env.example</Text>
            </Text>
            <Text style={styles.instructionsItem}>2. Fill in the missing values</Text>
            <Text style={styles.instructionsItem}>3. Restart the dev server</Text>
          </View>

          {onClose && (
            <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: "#0A0A0A",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 24,
    width: "100%",
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 69, 58, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconText: {
    color: "#FF453A",
    fontSize: 24,
    fontWeight: "700",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: "#8E8E93",
    marginTop: 4,
  },
  errorList: {
    marginBottom: 20,
  },
  errorItem: {
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 12,
    marginBottom: 12,
  },
  errorKey: {
    color: "#FF453A",
    fontFamily: "Courier",
    fontSize: 12,
    marginBottom: 4,
  },
  errorMessage: {
    color: "#E5E5E5",
  },
  instructions: {
    backgroundColor: "#111111",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222222",
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    color: "#00D632",
    fontWeight: "600",
    marginBottom: 8,
  },
  instructionsItem: {
    color: "#E5E5E5",
    marginBottom: 4,
  },
  code: {
    fontFamily: "Courier",
    backgroundColor: "#222222",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    color: "#FFFFFF",
    fontSize: 12,
  },
  button: {
    backgroundColor: "#00D632",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#000000",
    fontWeight: "700",
  },
});
