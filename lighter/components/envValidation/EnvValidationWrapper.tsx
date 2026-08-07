import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { getEnvironmentStatus } from "../../utils/envValidation";
import { EnvValidationModal } from "./EnvValidationModal";

interface EnvValidationWrapperProps {
  children: React.ReactNode;
}

export function EnvValidationWrapper({ children }: EnvValidationWrapperProps) {
  // getEnvironmentStatus() only reads Constants.expoConfig (already resolved at bundle time),
  // so this can run synchronously during the initial render — no loading state needed.
  const [status] = useState(() => getEnvironmentStatus());
  const [showModal, setShowModal] = useState(!status.isValid);

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
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  errorSubtitle: {
    color: "#8E8E93",
    textAlign: "center",
  },
});
