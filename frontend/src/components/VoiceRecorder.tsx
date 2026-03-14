import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, filename: string, duration: number) => void;
  existingRecordingUri?: string;
  existingRecordingDuration?: number;
  onDeleteRecording?: () => void;
  label?: string;
  compact?: boolean;
}

export function VoiceRecorder({
  onRecordingComplete,
  existingRecordingUri,
  existingRecordingDuration,
  onDeleteRecording,
  label = 'Nota Vocale',
  compact = false,
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(existingRecordingDuration || 0);
  const [localUri, setLocalUri] = useState<string | null>(existingRecordingUri || null);
  const [loading, setLoading] = useState(false);
  
  const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup
      if (durationInterval.current) clearInterval(durationInterval.current);
      if (sound) sound.unloadAsync();
      if (recording) recording.stopAndUnloadAsync();
    };
  }, []);

  useEffect(() => {
    if (existingRecordingUri) {
      setLocalUri(existingRecordingUri);
      setPlaybackDuration(existingRecordingDuration || 0);
    }
  }, [existingRecordingUri, existingRecordingDuration]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setLoading(true);
      
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permesso negato', 'Concedi i permessi per il microfono per registrare note vocali');
        setLoading(false);
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration counter
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Errore', 'Impossibile avviare la registrazione');
    } finally {
      setLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setLoading(true);
      
      // Stop duration counter
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
      
      // Stop recording
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      
      const uri = recording.getURI();
      const duration = recordingDuration;
      
      if (uri) {
        const filename = `nota_vocale_${Date.now()}.m4a`;
        setLocalUri(uri);
        setPlaybackDuration(duration);
        onRecordingComplete(uri, filename, duration);
      }
      
      setRecording(null);
      setIsRecording(false);
      
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('Errore', 'Impossibile fermare la registrazione');
    } finally {
      setLoading(false);
    }
  };

  const playRecording = async () => {
    if (!localUri) return;
    
    try {
      setLoading(true);
      
      // Unload previous sound if any
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Load and play sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: localUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
    } catch (err) {
      console.error('Failed to play recording', err);
      Alert.alert('Errore', 'Impossibile riprodurre la registrazione');
    } finally {
      setLoading(false);
    }
  };

  const stopPlayback = async () => {
    if (!sound) return;
    
    try {
      await sound.stopAsync();
      setIsPlaying(false);
      setPlaybackPosition(0);
    } catch (err) {
      console.error('Failed to stop playback', err);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis / 1000);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
      }
    }
  };

  const deleteRecording = () => {
    Alert.alert('Elimina', 'Vuoi eliminare questa nota vocale?', [
      { text: 'Annulla' },
      { text: 'Elimina', style: 'destructive', onPress: () => {
        setLocalUri(null);
        setPlaybackDuration(0);
        if (onDeleteRecording) onDeleteRecording();
      }},
    ]);
  };

  // Compact mode (for inline use)
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {!localUri && !isRecording && (
          <TouchableOpacity style={styles.compactRecordBtn} onPress={startRecording} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons name="mic" size={18} color={Colors.white} />
                <Text style={styles.compactRecordText}>Registra</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {isRecording && (
          <TouchableOpacity style={styles.compactStopBtn} onPress={stopRecording} disabled={loading}>
            <View style={styles.recordingIndicator} />
            <Text style={styles.compactStopText}>{formatDuration(recordingDuration)}</Text>
            <Ionicons name="stop" size={18} color={Colors.white} />
          </TouchableOpacity>
        )}
        
        {localUri && !isRecording && (
          <View style={styles.compactPlaybackContainer}>
            <TouchableOpacity 
              style={styles.compactPlayBtn} 
              onPress={isPlaying ? stopPlayback : playRecording}
              disabled={loading}
            >
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color={Colors.white} />
            </TouchableOpacity>
            <Text style={styles.compactDurationText}>
              {isPlaying ? formatDuration(playbackPosition) : formatDuration(playbackDuration)}
            </Text>
            <TouchableOpacity onPress={deleteRecording} style={styles.compactDeleteBtn}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Full mode
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {!localUri && !isRecording && (
        <TouchableOpacity style={styles.recordButton} onPress={startRecording} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <View style={styles.micCircle}>
                <Ionicons name="mic" size={28} color="#DC2626" />
              </View>
              <Text style={styles.recordText}>Tocca per registrare</Text>
            </>
          )}
        </TouchableOpacity>
      )}
      
      {isRecording && (
        <TouchableOpacity style={styles.recordingButton} onPress={stopRecording} disabled={loading}>
          <View style={styles.recordingPulse}>
            <View style={styles.recordingDot} />
          </View>
          <Text style={styles.recordingTime}>{formatDuration(recordingDuration)}</Text>
          <Text style={styles.stopText}>Tocca per fermare</Text>
        </TouchableOpacity>
      )}
      
      {localUri && !isRecording && (
        <View style={styles.playbackContainer}>
          <View style={styles.playbackRow}>
            <TouchableOpacity 
              style={styles.playButton} 
              onPress={isPlaying ? stopPlayback : playRecording}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color={Colors.white} />
              )}
            </TouchableOpacity>
            
            <View style={styles.playbackInfo}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0}%` }]} />
              </View>
              <Text style={styles.playbackTime}>
                {formatDuration(playbackPosition)} / {formatDuration(playbackDuration)}
              </Text>
            </View>
            
            <TouchableOpacity onPress={deleteRecording} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.rerecordButton} onPress={startRecording}>
            <Ionicons name="refresh" size={16} color={Colors.sky} />
            <Text style={styles.rerecordText}>Registra di nuovo</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMain,
    marginBottom: 10,
  },
  recordButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FECACA',
    borderStyle: 'dashed',
  },
  micCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordText: {
    fontSize: 14,
    color: '#B91C1C',
    fontWeight: '500',
  },
  recordingButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  recordingPulse: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  recordingTime: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  stopText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  playbackContainer: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.sky,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackInfo: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.sky,
    borderRadius: 3,
  },
  playbackTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  deleteButton: {
    padding: 8,
  },
  rerecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
  },
  rerecordText: {
    fontSize: 13,
    color: Colors.sky,
    fontWeight: '500',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  compactRecordText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  compactStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  compactStopText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  compactPlaybackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  compactPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.sky,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactDurationText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSec,
  },
  compactDeleteBtn: {
    padding: 4,
  },
});

export default VoiceRecorder;
