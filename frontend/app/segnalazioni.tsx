import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import { Colors } from '../src/constants/theme';
import { ScreenHeader, FormInput, PickerSelect, PrimaryButton } from '../src/components/SharedComponents';

const TIPOLOGIE = ['Guasto idraulico', 'Guasto elettrico', 'Ascensore', 'Infiltrazioni', 'Parti comuni', 'Pulizia', 'Sicurezza', 'Altro'];
const QUALITA = ['Proprietario', 'Inquilino', 'Delegato', 'Altro'];
const URGENZE = ['Bassa', 'Media', 'Alta', 'Urgente'];

interface MediaFile {
  uri: string;
  filename: string;
  mimeType: string;
  size?: number;
  type: 'image' | 'video' | 'pdf';
  uploadedId?: string;  // set after upload
  uploading?: boolean;
  error?: string;
}

export default function Segnalazioni() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [condomini, setCondomini] = useState<any[]>([]);
  const [form, setForm] = useState({ condominio_id: '', qualita: '', tipologia: '', descrizione: '', urgenza: 'Media' });
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    if (token) api.getCondomini(token).then(setCondomini).catch(() => {});
  }, [token]);

  const update = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ========== MEDIA PICKERS ==========

  const pickImage = async (useCamera: boolean) => {
    if (mediaFiles.length >= 10) {
      Alert.alert('Limite raggiunto', 'Puoi allegare massimo 10 file');
      return;
    }

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permesso negato', 'Concedi i permessi per accedere alla fotocamera/galleria');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false, mediaTypes: ['images', 'videos'] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true, selectionLimit: 10 - mediaFiles.length, mediaTypes: ['images', 'videos'] });

    if (result.canceled) return;

    const newFiles: MediaFile[] = result.assets.map(asset => ({
      uri: asset.uri,
      filename: asset.fileName || `media_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
      mimeType: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: asset.fileSize,
      type: (asset.type === 'video' ? 'video' : 'image') as 'image' | 'video',
    }));

    setMediaFiles(prev => [...prev, ...newFiles].slice(0, 10));
  };

  const pickDocument = async () => {
    if (mediaFiles.length >= 10) {
      Alert.alert('Limite raggiunto', 'Puoi allegare massimo 10 file');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const newFiles: MediaFile[] = result.assets.map(asset => ({
        uri: asset.uri,
        filename: asset.name || `documento_${Date.now()}.pdf`,
        mimeType: asset.mimeType || 'application/pdf',
        size: asset.size,
        type: 'pdf' as const,
      }));

      setMediaFiles(prev => [...prev, ...newFiles].slice(0, 10));
    } catch (e) {
      Alert.alert('Errore', 'Impossibile selezionare il documento');
    }
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string): string => {
    switch (type) {
      case 'image': return 'image';
      case 'video': return 'videocam';
      case 'pdf': return 'document-text';
      default: return 'attach';
    }
  };

  const getFileColor = (type: string): string => {
    switch (type) {
      case 'image': return '#3B82F6';
      case 'video': return '#8B5CF6';
      case 'pdf': return '#EF4444';
      default: return Colors.textMuted;
    }
  };

  // ========== SUBMIT ==========

  const handleSubmit = async () => {
    if (!form.condominio_id || !form.qualita || !form.tipologia || !form.descrizione.trim()) {
      Alert.alert('Attenzione', 'Compila tutti i campi obbligatori');
      return;
    }
    setLoading(true);
    try {
      // Upload all files first
      const allegatiIds: string[] = [];
      if (mediaFiles.length > 0) {
        setUploadProgress(`Caricamento file 0/${mediaFiles.length}...`);
        for (let i = 0; i < mediaFiles.length; i++) {
          setUploadProgress(`Caricamento file ${i + 1}/${mediaFiles.length}...`);
          try {
            const uploaded = await api.uploadFile(token!, mediaFiles[i].uri, mediaFiles[i].filename, mediaFiles[i].mimeType);
            allegatiIds.push(uploaded.id);
          } catch (e: any) {
            console.warn(`Failed to upload ${mediaFiles[i].filename}:`, e);
            // Continue uploading others
          }
        }
        setUploadProgress('');
      }

      const result = await api.createSegnalazione(token!, {
        ...form,
        allegati: allegatiIds,
      });

      Alert.alert(
        'Segnalazione Inviata',
        `La tua segnalazione è stata inviata con successo.\n\nProtocollo: ${result.protocollo}${allegatiIds.length > 0 ? `\nAllegati: ${allegatiIds.length} file` : ''}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Errore', e.message);
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const condOptions = condomini.map(c => c.nome);
  const selectedCondName = condomini.find(c => c.id === form.condominio_id)?.nome || '';

  return (
    <SafeAreaView style={s.safe}>
      <ScreenHeader title="Segnalazione Guasti" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.disclaimer}>
            <Text style={s.disclaimerText}>
              Richiesta di intervento / Segnalazione guasti — Lo studio si riserva di verificare la veridicità della richiesta. La presente non ha valore di notifica o comunicazione ufficiale.
            </Text>
          </View>

          <FormInput label="Nome e Cognome" value={`${user?.nome} ${user?.cognome}`} editable={false} testID="seg-nome-input" />
          <FormInput label="Email" value={user?.email} editable={false} testID="seg-email-input" />
          <FormInput label="Telefono" value={user?.telefono} editable={false} testID="seg-telefono-input" />

          <PickerSelect label="Condominio di riferimento *" value={selectedCondName} options={condOptions}
            onSelect={v => { const c = condomini.find(c => c.nome === v); if (c) update('condominio_id', c.id); }}
            testID="seg-condominio-picker" />

          <PickerSelect label="In qualità di *" value={form.qualita} options={QUALITA} onSelect={v => update('qualita', v)} testID="seg-qualita-picker" />
          <PickerSelect label="Tipologia della segnalazione *" value={form.tipologia} options={TIPOLOGIE} onSelect={v => update('tipologia', v)} testID="seg-tipologia-picker" />
          
          <FormInput label="Descrizione dettagliata del guasto *" value={form.descrizione} onChangeText={(v: string) => update('descrizione', v)} multiline placeholder="Descrivi il problema nel dettaglio..." testID="seg-descrizione-input" />

          <PickerSelect label="Livello di urgenza" value={form.urgenza} options={URGENZE} onSelect={v => update('urgenza', v)} testID="seg-urgenza-picker" />

          {/* ====== MEDIA UPLOAD SECTION ====== */}
          <View style={s.mediaSection}>
            <Text style={s.mediaSectionTitle}>Allegati (foto, video, documenti)</Text>
            <Text style={s.mediaSectionHint}>Puoi allegare fino a 10 file. Max 50MB per file.</Text>

            {/* Media action buttons */}
            <View style={s.mediaButtons}>
              <TouchableOpacity testID="seg-camera-btn" style={s.mediaBtn} onPress={() => pickImage(true)} activeOpacity={0.7}>
                <View style={[s.mediaBtnIcon, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="camera" size={22} color="#2563EB" />
                </View>
                <Text style={s.mediaBtnLabel}>Fotocamera</Text>
              </TouchableOpacity>

              <TouchableOpacity testID="seg-gallery-btn" style={s.mediaBtn} onPress={() => pickImage(false)} activeOpacity={0.7}>
                <View style={[s.mediaBtnIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="images" size={22} color="#7C3AED" />
                </View>
                <Text style={s.mediaBtnLabel}>Galleria</Text>
              </TouchableOpacity>

              <TouchableOpacity testID="seg-pdf-btn" style={s.mediaBtn} onPress={pickDocument} activeOpacity={0.7}>
                <View style={[s.mediaBtnIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="document-text" size={22} color="#DC2626" />
                </View>
                <Text style={s.mediaBtnLabel}>PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Selected files list */}
            {mediaFiles.length > 0 && (
              <View style={s.filesList}>
                <Text style={s.filesCount}>{mediaFiles.length}/10 file selezionati</Text>
                {mediaFiles.map((file, index) => (
                  <View key={index} style={s.fileItem}>
                    {file.type === 'image' ? (
                      <Image source={{ uri: file.uri }} style={s.fileThumbnail} />
                    ) : (
                      <View style={[s.fileIconWrap, { backgroundColor: getFileColor(file.type) + '15' }]}>
                        <Ionicons name={getFileIcon(file.type) as any} size={22} color={getFileColor(file.type)} />
                      </View>
                    )}
                    <View style={s.fileInfo}>
                      <Text style={s.fileName} numberOfLines={1}>{file.filename}</Text>
                      <View style={s.fileMetaRow}>
                        <Text style={s.fileMeta}>
                          {file.type === 'image' ? 'Foto' : file.type === 'video' ? 'Video' : 'PDF'}
                          {file.size ? ` • ${formatFileSize(file.size)}` : ''}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity testID={`seg-remove-file-${index}`} onPress={() => removeFile(index)} style={s.removeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Upload progress */}
          {uploadProgress ? (
            <View style={s.progressBar}>
              <ActivityIndicator size="small" color={Colors.navy} />
              <Text style={s.progressText}>{uploadProgress}</Text>
            </View>
          ) : null}

          <PrimaryButton title={loading ? "Invio in corso..." : "Invia Segnalazione"} onPress={handleSubmit} loading={loading} testID="seg-submit-btn" style={{ marginTop: 8 }} />
          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 16 },
  disclaimer: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#D97706' },
  disclaimerText: { fontSize: 12, color: '#92400E', lineHeight: 18 },
  // Media section
  mediaSection: { marginTop: 8, marginBottom: 16 },
  mediaSectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.textMain, marginBottom: 4 },
  mediaSectionHint: { fontSize: 12, color: Colors.textMuted, marginBottom: 14 },
  mediaButtons: { flexDirection: 'row', gap: 10 },
  mediaBtn: { flex: 1, alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  mediaBtnIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  mediaBtnLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSec },
  // Files list
  filesList: { marginTop: 14 },
  filesCount: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 8 },
  fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  fileThumbnail: { width: 48, height: 48, borderRadius: 8, backgroundColor: Colors.bg },
  fileIconWrap: { width: 48, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  fileInfo: { flex: 1, marginLeft: 12 },
  fileName: { fontSize: 13, fontWeight: '600', color: Colors.textMain },
  fileMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  fileMeta: { fontSize: 11, color: Colors.textMuted },
  removeBtn: { padding: 4 },
  // Progress
  progressBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.skyLight, borderRadius: 10, padding: 12, marginBottom: 12, gap: 8 },
  progressText: { fontSize: 13, fontWeight: '500', color: Colors.navy },
});
