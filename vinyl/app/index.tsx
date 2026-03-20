import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import {
  useSpotifyAuth,
  exchangeCodeForToken,
  getSpotifyProfile,
  saveUserToSupabase,
} from '../lib/spotify';

export default function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authing, setAuthing] = useState(false);
  const { request, response, promptAsync } = useSpotifyAuth();
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const userId = await SecureStore.getItemAsync('vinyl_user_id');
    if (userId) {
      router.replace('/(tabs)');
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (response?.type === 'success') {
      handleAuthSuccess(response);
    }
  }, [response]);

  const handleAuthSuccess = async (response: any) => {
    setAuthing(true);
    try {
      const { code } = response.params;
      const codeVerifier = request?.codeVerifier ?? '';
      const redirectUri = AuthSession.makeRedirectUri({ scheme: 'vinyl' });
      const tokens = await exchangeCodeForToken(code, codeVerifier, redirectUri);
      const profile = await getSpotifyProfile(tokens.access_token);
      const { data: user } = await saveUserToSupabase(profile, tokens.access_token, tokens.refresh_token);

      if (user) {
        await SecureStore.setItemAsync('vinyl_user_id', user.id);
        await SecureStore.setItemAsync('vinyl_access_token', tokens.access_token);
        await SecureStore.setItemAsync(
          'vinyl_token_expires_at',
          new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        );
        router.replace('/(tabs)');
      }
    } catch (e) {
      console.error(e);
      setAuthing(false);
    }
  };

  const animateButtonTo = (toValue: number) => {
    Animated.spring(buttonScale, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 220,
    }).start();
  };

  if (loading || authing) {
    return (
      <View style={styles.centered}>
        <View style={styles.loaderHalo} />
        <ActivityIndicator color="#fff" />
        {authing && <Text style={styles.loadingText}>Signing you in...</Text>}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />

      <View style={styles.top}>
        <Text style={styles.kicker}>MUSIC REVIEW APP</Text>
        <Text style={styles.logo}>VINYL</Text>
        <Text style={styles.tagline}>A quiet place to rate what you hear.</Text>
        <Text style={styles.description}>
          Save the tracks that mattered, write a few words, and share your taste with people who care.
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.featureCard}>
          <Text style={styles.featureLabel}>NOW PLAYING</Text>
          <Text style={styles.featureTitle}>Minimal reviews. Premium mood.</Text>
          <Text style={styles.featureText}>
            Track what you played, rate in a tap, and browse a feed shaped by real listening.
          </Text>
        </View>

        <Pressable
          onPress={() => promptAsync()}
          disabled={!request}
          onPressIn={() => animateButtonTo(0.97)}
          onPressOut={() => animateButtonTo(1)}
        >
          <Animated.View
            style={[
              styles.spotifyBtn,
              !request && styles.btnDisabled,
              { transform: [{ scale: buttonScale }] },
            ]}
          >
            <Text style={styles.spotifyBtnText}>Continue with Spotify</Text>
          </Animated.View>
        </Pressable>
        <Text style={styles.fine}>By continuing you agree to our terms of service.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  centered: {
    flex: 1,
    backgroundColor: '#080808',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderHalo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff08',
  },
  loadingText: {
    color: '#ffffff55',
    fontSize: 14,
    marginTop: 14,
  },
  orbOne: {
    position: 'absolute',
    top: -120,
    right: -70,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#ffffff08',
  },
  orbTwo: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#ffffff06',
  },
  top: {
    paddingTop: 26,
  },
  kicker: {
    color: '#ffffff40',
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '600',
  },
  logo: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: 9,
    marginTop: 14,
  },
  tagline: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    fontWeight: '700',
    marginTop: 24,
    maxWidth: 300,
  },
  description: {
    color: '#ffffff60',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
    maxWidth: 320,
  },
  bottom: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#111111',
    borderRadius: 20,
    padding: 18,
  },
  featureLabel: {
    color: '#ffffff35',
    fontSize: 11,
    letterSpacing: 1.6,
    fontWeight: '600',
    marginBottom: 10,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  featureText: {
    color: '#ffffff60',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  spotifyBtn: {
    backgroundColor: '#1DB954',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  spotifyBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  fine: {
    color: '#ffffff30',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
