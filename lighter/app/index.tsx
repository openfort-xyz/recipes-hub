import { useUser } from "@openfort/react-native";

import LoginScreen from "@/components/LoginScreen";
import { UserScreen } from "@/components/UserScreen";

export default function Index() {
  const { user } = useUser();

  return !user ? <LoginScreen /> : <UserScreen />;
}
