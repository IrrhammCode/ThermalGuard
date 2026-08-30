import { FadeInView } from '@/components/FadeIn';
import { Icon } from '@/components/Icon';
import { colors } from '@/constants/theme';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Missing', headerTintColor: colors.cool, headerStyle: { backgroundColor: colors.bg } }} />
      <View style={styles.container}>
        <FadeInView>
          <Icon name="exclamationmark.triangle.fill" size={28} color={colors.warn} />
          <Text style={styles.title}>This screen doesn’t exist.</Text>
          <Text style={styles.deck}>Return to Thermal Hold.</Text>
          <Link href="/" style={styles.link}>
            <Text style={styles.linkText}>Go to Walk</Text>
          </Link>
        </FadeInView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginTop: 16,
  },
  deck: {
    color: colors.muted,
    fontSize: 15,
    marginTop: 8,
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.cool,
  },
});
