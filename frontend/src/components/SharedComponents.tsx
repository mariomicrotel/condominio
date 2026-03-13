import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator, StyleSheet, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';

export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={sh.header}>
      <TouchableOpacity testID="header-back-btn" onPress={() => router.back()} style={sh.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="arrow-back" size={24} color={Colors.navy} />
      </TouchableOpacity>
      <Text style={sh.title} numberOfLines={1}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}
const sh = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: Colors.navy, textAlign: 'center' },
});

export function FormInput({ label, value, onChangeText, multiline, editable = true, placeholder, testID }: any) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={[fi.input, multiline && { height: 100, textAlignVertical: 'top' }, !editable && { backgroundColor: '#F1F5F9' }]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}
const fi = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.textSec, marginBottom: 6 },
  input: { height: 52, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 16, fontSize: 16, color: Colors.textMain },
});

export function PickerSelect({ label, value, options, onSelect, testID }: { label: string; value: string; options: string[]; onSelect: (v: string) => void; testID?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={ps.wrap}>
      <Text style={ps.label}>{label}</Text>
      <TouchableOpacity testID={testID} style={ps.btn} onPress={() => setOpen(true)}>
        <Text style={[ps.btnText, !value && { color: Colors.textMuted }]}>{value || 'Seleziona...'}</Text>
        <Ionicons name="chevron-down" size={20} color={Colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={ps.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={ps.modal}>
            <Text style={ps.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(i) => i}
              renderItem={({ item }) => (
                <TouchableOpacity testID={`picker-option-${item}`} style={[ps.option, item === value && { backgroundColor: Colors.skyLight }]} onPress={() => { onSelect(item); setOpen(false); }}>
                  <Text style={[ps.optionText, item === value && { color: Colors.navy, fontWeight: '600' }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
const ps = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: Colors.textSec, marginBottom: 6 },
  btn: { height: 52, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnText: { fontSize: 16, color: Colors.textMain },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: Colors.white, borderRadius: 12, maxHeight: '60%', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.navy, marginBottom: 12, textAlign: 'center' },
  option: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8 },
  optionText: { fontSize: 16, color: Colors.textMain },
});

export function PrimaryButton({ title, onPress, loading, testID, style }: any) {
  return (
    <TouchableOpacity testID={testID} style={[pb.btn, style]} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={pb.text}>{title}</Text>}
    </TouchableOpacity>
  );
}
const pb = StyleSheet.create({
  btn: { height: 56, borderRadius: 12, backgroundColor: Colors.navy, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16, fontWeight: '600', color: Colors.white },
});

export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    'Inviata': '#3B82F6', 'Presa in carico': '#F59E0B', 'In lavorazione': '#8B5CF6',
    'Risolta': '#10B981', 'In attesa': '#F59E0B', 'Pronto': '#3B82F6', 'Scaricabile': '#10B981',
    'In attesa di conferma': '#F59E0B', 'Confermato': '#10B981', 'Completato': '#6B7280',
    'Annullato': '#EF4444', 'Inviato': '#3B82F6', 'Ricevuto': '#10B981', 'Visionato': '#8B5CF6',
  };
  const color = colorMap[status] || '#6B7280';
  return (
    <View style={[sb.badge, { backgroundColor: color + '18' }]}>
      <Text style={[sb.text, { color }]}>{status}</Text>
    </View>
  );
}
const sb = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={es.wrap}>
      <Ionicons name="folder-open-outline" size={48} color={Colors.textMuted} />
      <Text style={es.text}>{message}</Text>
    </View>
  );
}
const es = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  text: { fontSize: 16, color: Colors.textMuted, marginTop: 12, textAlign: 'center' },
});
