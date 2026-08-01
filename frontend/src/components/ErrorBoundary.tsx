import React, { Component, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container} accessibilityRole="alert" accessibilityLabel="Si è verificato un errore">
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={56} color="#D97706" />
          </View>
          <Text style={styles.title}>Qualcosa è andato storto</Text>
          <Text style={styles.message}>
            Si è verificato un errore imprevisto. Prova a ricaricare la schermata.
          </Text>
          {__DEV__ && this.state.error && (
            <ScrollView style={styles.errorBox} contentContainerStyle={{ padding: 12 }}>
              <Text style={styles.errorText}>{this.state.error.message}</Text>
              <Text style={styles.stackText}>{this.state.error.stack?.slice(0, 500)}</Text>
            </ScrollView>
          )}
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel="Riprova"
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={20} color={Colors.white} />
            <Text style={styles.retryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.bg,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22, fontWeight: '700', color: Colors.navy,
    marginBottom: 12, textAlign: 'center',
  },
  message: {
    fontSize: 15, color: Colors.textSec, textAlign: 'center',
    lineHeight: 22, marginBottom: 24,
  },
  errorBox: {
    maxHeight: 120, width: '100%', backgroundColor: '#FEE2E2',
    borderRadius: 10, marginBottom: 20,
  },
  errorText: { fontSize: 12, color: '#991B1B', fontWeight: '600' },
  stackText: { fontSize: 10, color: '#7F1D1D', marginTop: 4 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.navy, paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: { fontSize: 16, fontWeight: '600', color: Colors.white },
});
