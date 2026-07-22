import { useOpenfortContext } from "@openfort/react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import LoginScreen from "@/components/LoginScreen";
import { UserScreen } from "@/components/UserScreen";
import { COLORS } from "@/constants/theme";
import { deriveAuthScreen } from "@/hooks/authGate";

export default function Index() {
  const { user, isReady, logout } = useOpenfortContext();
  const [staleSessionCleared, setStaleSessionCleared] = useState(false);
  // Guards the cold-launch stale-session check to fire exactly once — not on every isReady/user
  // change afterward, which would otherwise sign a user back out the moment they log in.
  const hasCheckedStaleSession = useRef(false);

  useEffect(() => {
    if (!isReady || hasCheckedStaleSession.current) return;
    hasCheckedStaleSession.current = true;
    // The SDK may have restored a session from storage on cold launch — explicit login only, so
    // sign it out for real rather than just hiding it behind the login UI, before anything
    // renders. logout() already clears local user state synchronously before the network call,
    // so a failed request shouldn't block showing the login screen — hence the no-op catch.
    const clearStaleSession = user ? logout().catch(() => {}) : Promise.resolve();
    clearStaleSession.finally(() => setStaleSessionCleared(true));
  }, [isReady, user, logout]);

  const screen = deriveAuthScreen({ isReady, hasUser: Boolean(user), staleSessionCleared });

  if (screen === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return screen === "login" ? <LoginScreen /> : <UserScreen />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
});
