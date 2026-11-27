/**
 * GeM Mobile Companion App - Tap-to-Explain GeM Jargon Glossary Modal
 *
 * Explains official GeM acronyms (EMD, e-PBG, MII, ATC, RA, BOQ, CRAC, UDIN, MAF,
 * GFR 149, Option Clause, Corrigendum) in plain English & हिन्दी (Hindi).
 */

import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  GEM_GLOSSARY_ENTRIES,
  type GemGlossaryEntry,
} from '../services/LanguageAndGlossaryService';
import { useTheme } from '../theme/ThemeContext';

interface GemGlossaryModalProps {
  visible: boolean;
  initialTermKey?: string | null;
  onClose: () => void;
}

export const GemGlossaryModal: React.FC<GemGlossaryModalProps> = ({
  visible,
  initialTermKey,
  onClose,
}) => {
  const { colors, language, setLanguage } = useTheme();
  const [query, setQuery] = useState('');

  const orderedEntries = useMemo<GemGlossaryEntry[]>(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? GEM_GLOSSARY_ENTRIES.filter((entry) =>
          [
            entry.term,
            entry.fullNameEn,
            entry.fullNameHi,
            entry.summaryEn,
            entry.summaryHi,
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        )
      : [...GEM_GLOSSARY_ENTRIES];

    if (!initialTermKey || q) return filtered;
    const norm = initialTermKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    const focusedIdx = filtered.findIndex(
      (e) =>
        e.key.toLowerCase().replace(/[^a-z0-9]/g, '') === norm ||
        e.term.toLowerCase().replace(/[^a-z0-9]/g, '') === norm
    );
    if (focusedIdx <= 0) return filtered;
    const [focused] = filtered.splice(focusedIdx, 1);
    return [focused, ...filtered];
  }, [query, initialTermKey]);

  const isHi = language === 'hi';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isHi ? 'GeM शब्दावली गाइड' : 'GeM Procurement Glossary'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {isHi
                  ? 'सरकारी टेंडर के मुख्य शब्दों का सरल अर्थ'
                  : 'Plain-language meanings for everyday GeM bidding terms'}
              </Text>
            </View>
            <View
              style={[
                styles.langToggle,
                { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle },
              ]}
            >
              {(['en', 'hi'] as const).map((code) => {
                const active = language === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setLanguage(code)}
                    style={[styles.langBtn, active && { backgroundColor: colors.primary }]}
                  >
                    <Text
                      style={[
                        styles.langBtnText,
                        { color: active ? colors.textInverse : colors.textSecondary },
                      ]}
                    >
                      {code === 'en' ? 'EN' : 'हिन्दी'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityLabel="Close glossary"
            >
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.borderSubtle,
                  color: colors.textPrimary,
                },
              ]}
              value={query}
              onChangeText={setQuery}
              placeholder={isHi ? 'शब्द खोजें (जैसे EMD, ATC, MII)...' : 'Filter terms (e.g. EMD, e-PBG, ATC, UDIN)...'}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {orderedEntries.map((entry, idx) => {
              const isHighlighted =
                idx === 0 &&
                Boolean(initialTermKey) &&
                !query.trim() &&
                entry.key.toLowerCase().replace(/[^a-z0-9]/g, '') ===
                  initialTermKey!.toLowerCase().replace(/[^a-z0-9]/g, '');

              return (
                <View
                  key={entry.key}
                  style={[
                    styles.entryCard,
                    {
                      backgroundColor: isHighlighted ? colors.primaryTint : colors.surfaceSubtle,
                      borderColor: isHighlighted ? colors.primary : colors.borderSubtle,
                    },
                  ]}
                >
                  <View style={styles.entryTop}>
                    <View style={[styles.termPill, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.termPillText, { color: colors.textInverse }]}>
                        {entry.term}
                      </Text>
                    </View>
                    <Text style={[styles.fullName, { color: colors.textPrimary }]}>
                      {isHi ? entry.fullNameHi : entry.fullNameEn}
                    </Text>
                  </View>
                  <Text style={[styles.summaryText, { color: colors.textPrimary }]}>
                    {isHi ? entry.summaryHi : entry.summaryEn}
                  </Text>
                  <Text style={[styles.tipText, { color: colors.primary }]}>
                    {isHi ? 'सलाह: ' : 'Seller tip: '}
                    {isHi ? entry.tipHi : entry.tipEn}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  backdropDismiss: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    gap: 8,
  },
  title: { fontSize: 15.5, fontWeight: '800' },
  subtitle: { fontSize: 11.5, marginTop: 2 },
  langToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  langBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  langBtnText: { fontSize: 11, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 18, fontWeight: '700' },
  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minHeight: 42,
    fontSize: 13,
  },
  body: { maxHeight: 520 },
  bodyContent: { padding: 14, gap: 10, paddingBottom: 24 },
  entryCard: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 12,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  termPill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  termPillText: { fontSize: 10.5, fontWeight: '900' },
  fullName: { fontSize: 13, fontWeight: '800', flex: 1 },
  summaryText: { fontSize: 12.5, lineHeight: 18 },
  tipText: { fontSize: 11.5, fontWeight: '700', lineHeight: 16.5, marginTop: 6 },
});
