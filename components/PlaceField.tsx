import { Icon } from '@/components/Icon';
import { colors } from '@/constants/theme';
import {
  kindLabel,
  placeById,
  placeLabel,
  resolvePlaceQuery,
  searchStops,
  type Place,
} from '@/lib/places';
import { placeImage } from '@/lib/placeImages';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export type PlaceFieldHandle = {
  resolve: () => Promise<string | null>;
};

export const PlaceField = forwardRef<PlaceFieldHandle, {
  kicker: string;
  placeId: string;
  onChange: (id: string) => void;
  compact?: boolean;
  excludeId?: string;
  style?: StyleProp<ViewStyle>;
}>(function PlaceField({ kicker, placeId, onChange, compact, excludeId, style }, ref) {
  const selected = placeById(placeId);
  const [text, setText] = useState(placeLabel(placeId));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(placeLabel(placeId));
  }, [placeId]);

  const hits = searchStops(text, excludeId, 8);
  const selectedImage = placeImage(placeId);

  async function commit(nextText = text): Promise<string | null> {
    const already = placeById(placeId);
    if (already && nextText.trim() === already.name) {
      setOpen(false);
      setError(null);
      return placeId;
    }
    setBusy(true);
    setError(null);
    try {
      const place = await resolvePlaceQuery(nextText, excludeId);
      if (!place) {
        setError('No downtown match. Try a stop or Phoenix address.');
        return null;
      }
      setText(place.name);
      onChange(place.id);
      setOpen(false);
      return place.id;
    } finally {
      setBusy(false);
    }
  }

  useImperativeHandle(ref, () => ({ resolve: () => commit() }));

  return (
    <View style={style}>
      <View style={[styles.field, compact && styles.fieldCompact]}>
        {/* Thumbnail for selected place */}
        {selectedImage && !open ? (
          <View style={styles.fieldWithImage}>
            <Image source={selectedImage} style={styles.selectedImage} />
            <View style={styles.fieldContent}>
              <Text style={styles.kicker}>{kicker}</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={text}
                  onChangeText={(v) => {
                    setText(v);
                    setError(null);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  onSubmitEditing={() => void commit()}
                  placeholder="Type a stop or address"
                  placeholderTextColor={colors.muted}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="search"
                  style={[styles.input, compact && styles.inputCompact]}
                />
                {busy ? <ActivityIndicator color={colors.cool} /> : null}
              </View>
              {compact ? null : (
                <Text style={styles.kind}>
                  {error ? error : selected ? kindLabel(selected.kind) : 'Snaps to the downtown grid'}
                </Text>
              )}
              {compact && error ? <Text style={styles.err}>{error}</Text> : null}
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.kicker}>{kicker}</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={(v) => {
                  setText(v);
                  setError(null);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onSubmitEditing={() => void commit()}
                placeholder="Type a stop or address"
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="search"
                style={[styles.input, compact && styles.inputCompact]}
              />
              {busy ? <ActivityIndicator color={colors.cool} /> : null}
            </View>
            {compact ? null : (
              <Text style={styles.kind}>
                {error ? error : selected ? kindLabel(selected.kind) : 'Snaps to the downtown grid'}
              </Text>
            )}
            {compact && error ? <Text style={styles.err}>{error}</Text> : null}
          </>
        )}
      </View>
      {open && !busy ? (
        <View style={styles.suggest}>
          {hits.map((p) => (
            <PlaceRow
              key={p.id}
              place={p}
              on={p.id === placeId}
              onPress={() => {
                setText(p.name);
                onChange(p.id);
                setOpen(false);
                setError(null);
              }}
            />
          ))}
          {text.trim() && hits[0] && hits.every((h) => h.name !== text.trim()) ? (
            <Pressable onPress={() => void commit()} style={styles.useRow}>
              <Icon name="location.fill" size={14} color={colors.cool} />
              <Text style={styles.useText}>Use "{text.trim()}" — snap to grid</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

function PlaceRow({ place, on, onPress }: { place: Place; on: boolean; onPress: () => void }) {
  const img = placeImage(place.id);
  return (
    <Pressable onPress={onPress} style={[styles.row, on && styles.rowOn]}>
      {img ? (
        <Image source={img} style={styles.rowImage} />
      ) : (
        <Icon
          name={place.indoor ? 'building.2.fill' : place.kind === 'park' ? 'tree.fill' : 'figure.walk'}
          size={16}
          color={on ? colors.cool2 : colors.text}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{place.name}</Text>
        <Text style={styles.rowKind}>{kindLabel(place.kind)}</Text>
      </View>
      {on ? <Icon name="checkmark.seal.fill" size={16} color={colors.cool2} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    minHeight: 72,
    overflow: 'hidden',
  },
  fieldCompact: { minHeight: 58, paddingVertical: 10 },
  fieldWithImage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldContent: {
    flex: 1,
  },
  selectedImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.surface2,
  },
  kicker: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  input: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', paddingVertical: 4 },
  inputCompact: { fontSize: 13 },
  kind: { color: colors.muted, fontSize: 11, marginTop: 4 },
  err: { color: colors.heat, fontSize: 11, marginTop: 4 },
  suggest: {
    marginTop: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowOn: { backgroundColor: 'rgba(46,196,182,0.08)' },
  rowImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface2,
  },
  rowName: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowKind: { color: colors.muted, fontSize: 11, marginTop: 2 },
  useRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  useText: { color: colors.cool, fontSize: 14, fontWeight: '600', flex: 1 },
});
