import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { Colors } from '../../constants/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const GRAVITA_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'Lieve':    { bg: '#FEF3C7', text: '#92400E', icon: 'alert-circle-outline' },
  'Moderata': { bg: '#FED7AA', text: '#9A3412', icon: 'alert-circle' },
  'Grave':    { bg: '#FECACA', text: '#991B1B', icon: 'warning' },
  'Urgente':  { bg: '#FCA5A5', text: '#7F1D1D', icon: 'flame' },
};

const STATO_COLORS: Record<string, { bg: string; text: string }> = {
  'ok':              { bg: '#DCFCE7', text: '#15803D' },
  'anomalia':        { bg: '#FEE2E2', text: '#DC2626' },
  'non_controllato': { bg: '#F3F4F6', text: '#6B7280' },
  'in_corso':        { bg: '#DBEAFE', text: '#1D4ED8' },
  'completato':      { bg: '#DCFCE7', text: '#15803D' },
};

// ─── AudioPlayer Component (Web) ─────────────────────────────────────────────
function AudioPlayer({ fileUrl, label }: { fileUrl: string; label: string }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const audio = new Audio(fileUrl);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => { setPlaying(false); setCurrentTime(0); });
    return () => { audio.pause(); audio.src = ''; };
  }, [fileUrl]);

  const togglePlay = () => {
    if (!audioRef.current) {
      // Fallback: open in browser
      Linking.openURL(fileUrl);
      return;
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <View style={ap.wrap}>
      <TouchableOpacity onPress={togglePlay} style={ap.playBtn} activeOpacity={0.7}>
        <Ionicons name={playing ? 'pause' : 'play'} size={16} color={Colors.white} />
      </TouchableOpacity>
      <View style={ap.info}>
        <Text style={ap.label} numberOfLines={1}>{label}</Text>
        <View style={ap.progressBar}>
          <View style={[ap.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={ap.time}>{fmtTime(currentTime)} / {fmtTime(duration)}</Text>
      </View>
      <TouchableOpacity onPress={() => Linking.openURL(fileUrl)} style={ap.dlBtn}>
        <Ionicons name="download-outline" size={14} color={Colors.textSec} />
      </TouchableOpacity>
    </View>
  );
}
const ap = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, gap: 10, borderWidth: 1, borderColor: Colors.border },
  playBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: Colors.textMain, marginBottom: 4 },
  progressBar: { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 },
  time: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  dlBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
});

// ─── PhotoGallery Component ───────────────────────────────────────────────────
function PhotoGallery({ photos, captions }: { photos: any[]; captions?: string[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <View>
      <View style={pg.grid}>
        {photos.map((photo, idx) => {
          const fileUrl = api.getFileUrl(photo.id, photo.filename);
          const caption = captions?.[idx] || '';
          return (
            <TouchableOpacity key={photo.id} style={pg.thumb} activeOpacity={0.8} onPress={() => setLightbox(idx)}>
              <Image source={{ uri: fileUrl }} style={pg.thumbImg} resizeMode="cover" />
              {caption ? (
                <View style={pg.captionWrap}>
                  <Text style={pg.captionText} numberOfLines={2}>{caption}</Text>
                </View>
              ) : null}
              <View style={pg.zoomBadge}>
                <Ionicons name="expand-outline" size={12} color={Colors.white} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lightbox */}
      {lightbox !== null && (
        <View style={pg.lightbox}>
          <TouchableOpacity style={pg.lightboxBg} onPress={() => setLightbox(null)} activeOpacity={1} />
          <View style={pg.lightboxContent}>
            <TouchableOpacity style={pg.lightboxClose} onPress={() => setLightbox(null)}>
              <Ionicons name="close" size={24} color={Colors.white} />
            </TouchableOpacity>
            <Image
              source={{ uri: api.getFileUrl(photos[lightbox].id, photos[lightbox].filename) }}
              style={pg.lightboxImg}
              resizeMode="contain"
            />
            {captions?.[lightbox] ? (
              <Text style={pg.lightboxCaption}>{captions[lightbox]}</Text>
            ) : null}
            <View style={pg.lightboxNav}>
              {lightbox > 0 && (
                <TouchableOpacity style={pg.navBtn} onPress={() => setLightbox(lightbox - 1)}>
                  <Ionicons name="chevron-back" size={20} color={Colors.white} />
                </TouchableOpacity>
              )}
              <Text style={pg.lightboxCount}>{lightbox + 1} / {photos.length}</Text>
              {lightbox < photos.length - 1 && (
                <TouchableOpacity style={pg.navBtn} onPress={() => setLightbox(lightbox + 1)}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.white} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={pg.dlBtn}
              onPress={() => Linking.openURL(api.getFileUrl(photos[lightbox].id, photos[lightbox].filename))}
            >
              <Ionicons name="download-outline" size={14} color={Colors.white} />
              <Text style={pg.dlText}>Scarica originale</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
const pg = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 140, height: 110, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, position: 'relative' },
  thumbImg: { width: '100%', height: '100%' },
  captionWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 6, paddingVertical: 3 },
  captionText: { fontSize: 10, color: Colors.white },
  zoomBadge: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  lightbox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, justifyContent: 'center', alignItems: 'center' },
  lightboxBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)' },
  lightboxContent: { alignItems: 'center', zIndex: 1001, maxWidth: '90%', maxHeight: '90%' },
  lightboxClose: { position: 'absolute', top: -40, right: -20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 1002 },
  lightboxImg: { width: 700, height: 500, borderRadius: 12 },
  lightboxCaption: { fontSize: 14, color: Colors.white, marginTop: 12, textAlign: 'center' },
  lightboxNav: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  lightboxCount: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)' },
  dlText: { fontSize: 12, color: Colors.white },
});

// ─── AnomaliaCard Component ───────────────────────────────────────────────────
function AnomaliaCard({ anomalia, voce }: { anomalia: any; voce: string }) {
  const grav = GRAVITA_COLORS[anomalia.gravita] || GRAVITA_COLORS['Moderata'];

  return (
    <View style={ac.wrap}>
      {/* Header */}
      <View style={[ac.header, { backgroundColor: grav.bg }]}>
        <Ionicons name={grav.icon as any} size={18} color={grav.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[ac.headerTitle, { color: grav.text }]}>{voce}</Text>
          <Text style={[ac.headerGravita, { color: grav.text }]}>Gravità: {anomalia.gravita}</Text>
        </View>
        {anomalia.segnalazione_id && (
          <View style={ac.segBadge}>
            <Ionicons name="link" size={12} color="#6366F1" />
            <Text style={ac.segBadgeText}>Segnalazione aperta</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {anomalia.descrizione && (
        <View style={ac.section}>
          <Text style={ac.sectionLabel}>Descrizione</Text>
          <Text style={ac.desc}>{anomalia.descrizione}</Text>
        </View>
      )}

      {/* Photos */}
      {anomalia.foto_dettagli && anomalia.foto_dettagli.length > 0 && (
        <View style={ac.section}>
          <View style={ac.sectionHeader}>
            <Ionicons name="camera-outline" size={14} color={Colors.textSec} />
            <Text style={ac.sectionLabel}>{anomalia.foto_dettagli.length} foto</Text>
          </View>
          <PhotoGallery photos={anomalia.foto_dettagli} captions={anomalia.foto_didascalie} />
        </View>
      )}

      {/* Voice notes */}
      {anomalia.nota_vocale_dettagli && anomalia.nota_vocale_dettagli.length > 0 && (
        <View style={ac.section}>
          <View style={ac.sectionHeader}>
            <Ionicons name="mic-outline" size={14} color={Colors.textSec} />
            <Text style={ac.sectionLabel}>{anomalia.nota_vocale_dettagli.length} nota/e vocale/i</Text>
          </View>
          {anomalia.nota_vocale_dettagli.map((vn: any, idx: number) => (
            <View key={vn.id} style={{ marginBottom: idx < anomalia.nota_vocale_dettagli.length - 1 ? 8 : 0 }}>
              <AudioPlayer
                fileUrl={api.getFileUrl(vn.id, vn.filename)}
                label={`Nota vocale ${idx + 1}`}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
const ac = StyleSheet.create({
  wrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  headerTitle: { fontSize: 14, fontWeight: '700' },
  headerGravita: { fontSize: 12, opacity: 0.8, marginTop: 1 },
  segBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EEF2FF' },
  segBadgeText: { fontSize: 11, fontWeight: '600', color: '#6366F1' },
  section: { padding: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSec, textTransform: 'uppercase', letterSpacing: 0.3 },
  desc: { fontSize: 14, color: Colors.textMain, lineHeight: 20 },
});

// ─── InfoPill ─────────────────────────────────────────────────────────────────
function InfoPill({ label, value, icon, color = Colors.navy }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <View style={ip.wrap}>
      <Ionicons name={icon as any} size={14} color={color} style={{ marginRight: 6 }} />
      <View>
        <Text style={ip.label}>{label}</Text>
        <Text style={ip.value}>{value}</Text>
      </View>
    </View>
  );
}
const ip = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, borderRadius: 10, padding: 10, minWidth: 140 },
  label: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.3 },
  value: { fontSize: 14, fontWeight: '700', color: Colors.textMain, marginTop: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT: SopralluogoDetail
// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  sopralluogoId: string;
  token: string;
  condominiMap?: Record<string, string>; // id → nome
  collaboratoriMap?: Record<string, string>; // id → nome
};

export default function SopralluogoDetail({ sopralluogoId, token, condominiMap = {}, collaboratoriMap = {} }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'riepilogo' | 'checklist' | 'anomalie'>('riepilogo');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const d = await api.getSopralluogo(token, sopralluogoId);
        setData(d);
      } catch (e: any) {
        setError(e.message || 'Errore nel caricamento');
      } finally {
        setLoading(false);
      }
    })();
  }, [sopralluogoId, token]);

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.navy} />
        <Text style={{ marginTop: 12, color: Colors.textSec }}>Caricamento sopralluogo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <Ionicons name="alert-circle" size={40} color="#DC2626" />
        <Text style={{ marginTop: 12, color: '#DC2626', fontWeight: '600' }}>{error}</Text>
      </View>
    );
  }

  if (!data) return null;

  const checklist = data.checklist || [];
  const anomalieItems = checklist.filter((c: any) => c.stato === 'anomalia' && c.anomalia);
  const okItems = checklist.filter((c: any) => c.stato === 'ok');
  const ncItems = checklist.filter((c: any) => c.stato === 'non_controllato');
  const condName = condominiMap[data.condominio_id] || data.condominio_nome || '—';
  const collabName = collaboratoriMap[data.collaboratore_id] || data.eseguito_da || '—';
  const statoC = STATO_COLORS[data.stato] || STATO_COLORS['non_controllato'];

  return (
    <View style={s.root}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.condName}>{condName}</Text>
            <Text style={s.condAddr}>{data.condominio_indirizzo || ''}</Text>
          </View>
          <View style={[s.statoBadge, { backgroundColor: statoC.bg }]}>
            <Text style={[s.statoText, { color: statoC.text }]}>{data.stato}</Text>
          </View>
        </View>

        {/* Info pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={s.pillsRow}>
            <InfoPill label="Data" value={fmtDate(data.data)} icon="calendar-outline" />
            <InfoPill label="Ora inizio" value={data.ora_inizio || '—'} icon="time-outline" />
            {data.ora_fine && <InfoPill label="Ora fine" value={data.ora_fine} icon="time-outline" color="#10B981" />}
            <InfoPill label="Collaboratore" value={collabName} icon="person-outline" color="#8B5CF6" />
            <InfoPill label="Motivo" value={data.motivo || '—'} icon="document-text-outline" color="#F59E0B" />
            {data.valutazione && <InfoPill label="Valutazione" value={data.valutazione} icon="star-outline" color={
              data.valutazione === 'Buono' ? '#10B981' : data.valutazione === 'Critico' ? '#DC2626' : '#F59E0B'
            } />}
          </View>
        </ScrollView>
      </View>

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        <View style={[s.stat, { borderLeftColor: '#10B981' }]}>
          <Text style={[s.statNum, { color: '#10B981' }]}>{data.checklist_ok || okItems.length}</Text>
          <Text style={s.statLabel}>OK</Text>
        </View>
        <View style={[s.stat, { borderLeftColor: '#DC2626' }]}>
          <Text style={[s.statNum, { color: '#DC2626' }]}>{data.checklist_anomalie || anomalieItems.length}</Text>
          <Text style={s.statLabel}>Anomalie</Text>
        </View>
        <View style={[s.stat, { borderLeftColor: '#6B7280' }]}>
          <Text style={[s.statNum, { color: '#6B7280' }]}>{data.checklist_non_controllato || ncItems.length}</Text>
          <Text style={s.statLabel}>Non controllati</Text>
        </View>
        <View style={[s.stat, { borderLeftColor: '#6366F1' }]}>
          <Text style={[s.statNum, { color: '#6366F1' }]}>{checklist.length}</Text>
          <Text style={s.statLabel}>Totale voci</Text>
        </View>
      </View>

      {/* ── General notes & voice note ── */}
      {(data.note_generali || data.nota_vocale_generale_dettagli) && (
        <View style={s.notesSection}>
          <Text style={s.notesSectionTitle}>
            <Ionicons name="document-text" size={14} color={Colors.navy} /> Note generali
          </Text>
          {data.note_generali ? <Text style={s.notesText}>{data.note_generali}</Text> : null}
          {data.nota_vocale_generale_dettagli && (
            <View style={{ marginTop: 8 }}>
              <AudioPlayer
                fileUrl={api.getFileUrl(data.nota_vocale_generale_dettagli.id, data.nota_vocale_generale_dettagli.filename)}
                label="Nota vocale generale"
              />
            </View>
          )}
        </View>
      )}

      {/* ── Tabs ── */}
      <View style={s.tabRow}>
        {[
          { key: 'riepilogo', label: 'Riepilogo', icon: 'list-outline' },
          { key: 'checklist', label: 'Checklist completa', icon: 'checkbox-outline' },
          { key: 'anomalie', label: `Anomalie (${anomalieItems.length})`, icon: 'warning-outline' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={t.icon as any} size={14} color={activeTab === t.key ? Colors.navy : Colors.textMuted} />
            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB: Riepilogo ── */}
      {activeTab === 'riepilogo' && (
        <View>
          {/* Anomalie summary */}
          {anomalieItems.length > 0 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={s.sectionTitle}>Anomalie rilevate</Text>
              {anomalieItems.map((item: any) => (
                <AnomaliaCard key={item.id} anomalia={item.anomalia} voce={item.voce} />
              ))}
            </View>
          ) : (
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
              <Text style={s.emptyTitle}>Nessuna anomalia rilevata</Text>
              <Text style={s.emptySubText}>Tutti gli elementi controllati risultano in ordine.</Text>
            </View>
          )}
        </View>
      )}

      {/* ── TAB: Checklist completa ── */}
      {activeTab === 'checklist' && (
        <View>
          {checklist.map((item: any, idx: number) => {
            const sc = STATO_COLORS[item.stato] || STATO_COLORS['non_controllato'];
            const hasAnomalia = item.stato === 'anomalia' && item.anomalia;
            return (
              <View key={item.id || idx} style={[cl.item, { borderLeftColor: sc.text, borderLeftWidth: 3 }]}>
                <View style={cl.itemHeader}>
                  <Text style={cl.itemNum}>{idx + 1}</Text>
                  <Text style={cl.itemVoce}>{item.voce}</Text>
                  <View style={[cl.itemBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[cl.itemBadgeText, { color: sc.text }]}>
                      {item.stato === 'ok' ? 'OK' : item.stato === 'anomalia' ? 'Anomalia' : 'Non controllato'}
                    </Text>
                  </View>
                </View>
                {hasAnomalia && (
                  <View style={cl.anomaliaInline}>
                    <Text style={cl.anomaliaDesc}>{item.anomalia.descrizione}</Text>
                    <View style={cl.anomaliaMetaRow}>
                      <Text style={cl.anomaliaGravita}>Gravità: {item.anomalia.gravita}</Text>
                      {item.anomalia.foto_dettagli?.length > 0 && (
                        <View style={cl.mediaBadge}>
                          <Ionicons name="camera" size={11} color="#6366F1" />
                          <Text style={cl.mediaBadgeText}>{item.anomalia.foto_dettagli.length} foto</Text>
                        </View>
                      )}
                      {item.anomalia.nota_vocale_dettagli?.length > 0 && (
                        <View style={cl.mediaBadge}>
                          <Ionicons name="mic" size={11} color="#6366F1" />
                          <Text style={cl.mediaBadgeText}>{item.anomalia.nota_vocale_dettagli.length} audio</Text>
                        </View>
                      )}
                      {item.anomalia.segnalazione_id && (
                        <View style={[cl.mediaBadge, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="link" size={11} color="#D97706" />
                          <Text style={[cl.mediaBadgeText, { color: '#D97706' }]}>Segnalazione</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── TAB: Anomalie detail ── */}
      {activeTab === 'anomalie' && (
        <View>
          {anomalieItems.length > 0 ? (
            anomalieItems.map((item: any) => (
              <AnomaliaCard key={item.id} anomalia={item.anomalia} voce={item.voce} />
            ))
          ) : (
            <View style={s.emptyBox}>
              <Ionicons name="shield-checkmark" size={40} color="#10B981" />
              <Text style={s.emptyTitle}>Nessuna anomalia</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Final notes & voice note ── */}
      {(data.note_finali || data.nota_vocale_finale_dettagli) && (
        <View style={[s.notesSection, { marginTop: 20 }]}>
          <Text style={s.notesSectionTitle}>
            <Ionicons name="flag" size={14} color="#10B981" /> Note finali
          </Text>
          {data.note_finali ? <Text style={s.notesText}>{data.note_finali}</Text> : null}
          {data.nota_vocale_finale_dettagli && (
            <View style={{ marginTop: 8 }}>
              <AudioPlayer
                fileUrl={api.getFileUrl(data.nota_vocale_finale_dettagli.id, data.nota_vocale_finale_dettagli.filename)}
                label="Nota vocale finale"
              />
            </View>
          )}
        </View>
      )}

      {/* ── Timestamp footer ── */}
      <View style={s.footer}>
        <Text style={s.footerText}>Creato: {fmtDateTime(data.created_at)}</Text>
        {data.completed_at && <Text style={s.footerText}>Completato: {fmtDateTime(data.completed_at)}</Text>}
      </View>
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { },
  header: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  condName: { fontSize: 20, fontWeight: '800', color: Colors.navy },
  condAddr: { fontSize: 13, color: Colors.textSec, marginTop: 2 },
  statoBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statoText: { fontSize: 13, fontWeight: '700' },
  pillsRow: { flexDirection: 'row', gap: 10 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  stat: { flex: 1, backgroundColor: Colors.white, borderRadius: 10, padding: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', marginTop: 2, fontWeight: '600' },

  notesSection: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  notesSectionTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  notesText: { fontSize: 14, color: '#78350F', lineHeight: 20 },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  tabText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  tabTextActive: { color: Colors.navy, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.navy, marginBottom: 12 },

  emptyBox: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#15803D', marginTop: 10 },
  emptySubText: { fontSize: 13, color: '#166534', marginTop: 4 },

  footer: { flexDirection: 'row', gap: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 16 },
  footerText: { fontSize: 12, color: Colors.textMuted },
});

// ─── Checklist Styles ─────────────────────────────────────────────────────────
const cl = StyleSheet.create({
  item: { backgroundColor: Colors.white, borderRadius: 8, marginBottom: 6, padding: 10, borderWidth: 1, borderColor: Colors.border },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.bg, textAlign: 'center', lineHeight: 24, fontSize: 11, fontWeight: '700', color: Colors.textSec, marginRight: 10, overflow: 'hidden' },
  itemVoce: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textMain },
  itemBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  itemBadgeText: { fontSize: 11, fontWeight: '700' },
  anomaliaInline: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#FEE2E2' },
  anomaliaDesc: { fontSize: 13, color: Colors.textMain, lineHeight: 18 },
  anomaliaMetaRow: { flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  anomaliaGravita: { fontSize: 11, fontWeight: '600', color: '#DC2626' },
  mediaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#EEF2FF' },
  mediaBadgeText: { fontSize: 10, fontWeight: '600', color: '#6366F1' },
});
