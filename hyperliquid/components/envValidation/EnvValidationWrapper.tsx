import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getEnvironmentStatus } from "../../utils/envValidation";
import { EnvValidationModal } from "./EnvValidationModal";
import { colors, spacing } from "../ui/theme";

interface EnvValidationWrapperProps {
  children: React.ReactNode;
}

export function EnvValidationWrapper({ children }: EnvValidationWrapperProps) {
  // Validation is a pure, synchronous read of Constants.expoConfig — no effect
  // needed, it's available on the very first render.
  const [status] = useState(() => getEnvironmentStatus());
  const [showModal, setShowModal] = useState(() => !status.isValid);

  if (!status.isValid) {
    return (
      <>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Configuration required</Text>
          <Text style={styles.errorSubtitle}>Update your environment variables to run the app.</Text>
        </View>
        <EnvValidationModal visible={showModal} errors={status.errors} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    color: colors.textSecondary,
    textAlign: "center",
  },
});
