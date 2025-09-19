// app/index.tsx
import LoginScreen from '../components/LoginScreen';
import { UserScreen } from '../components/UserScreen';
import { useOpenfort } from '@openfort/react-native';
 
export default function Index() {
  const { user } = useOpenfort();
 
  if (user === null) {
    console.warn('Tried to fetch user from Openfort. The user is not authenticated yet.');
  } else {
    console.log('Fetched user from Openfort:', user);
  }
 
  return !user ? <LoginScreen /> : <UserScreen />;
}
