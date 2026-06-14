import { useUser } from "@openfort/react-native";
import { CardApp } from "@/components/CardApp";
import { LoginScreen } from "@/components/LoginScreen";

export default function Index() {
  const { user } = useUser();
  return user ? <CardApp /> : <LoginScreen />;
}
