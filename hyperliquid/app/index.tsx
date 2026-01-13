import LoginScreen from '@/components/LoginScreen';
import { UserScreen } from '@/components/UserScreen';
import { useUser } from '@openfort/react-native';

export default function Index() {
  const { user } = useUser();

  return !user ? <LoginScreen /> : <UserScreen />;
}
