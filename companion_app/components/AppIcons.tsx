/**
 * Crisp zero-dependency geometric React Native UI icons.
 * Renders cleanly across Android APK, iOS IPA, Hermes, and Expo Go without
 * relying on external icon-font native linking or decorative emojis.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

export type AppIconName =
  | 'home'
  | 'search'
  | 'bids'
  | 'auctions'
  | 'more'
  | 'portal'
  | 'document'
  | 'contract'
  | 'bell'
  | 'buyer'
  | 'seller'
  | 'help'
  | 'theme'
  | 'textSize'
  | 'radar'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'calendar'
  | 'profile'
  | 'calculator';

interface AppIconProps {
  name: AppIconName;
  color: string;
  size?: number;
}

export const AppIcon: React.FC<AppIconProps> = React.memo(({ name, color, size = 18 }) => {
  const s = size;
  const stroke = Math.max(1.6, s * 0.1);

  switch (name) {
    case 'home':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.56,
              height: s * 0.56,
              borderLeftWidth: stroke,
              borderTopWidth: stroke,
              borderColor: color,
              transform: [{ rotate: '45deg' }, { translateY: s * 0.14 }],
            }}
          />
          <View
            style={{
              width: s * 0.62,
              height: s * 0.42,
              borderLeftWidth: stroke,
              borderRightWidth: stroke,
              borderBottomWidth: stroke,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              borderColor: color,
              marginTop: -s * 0.18,
            }}
          />
        </View>
      );

    case 'search':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.62,
              height: s * 0.62,
              borderRadius: s * 0.31,
              borderWidth: stroke,
              borderColor: color,
              transform: [{ translateX: -s * 0.08 }, { translateY: -s * 0.08 }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.34,
              height: stroke,
              borderRadius: stroke,
              backgroundColor: color,
              right: s * 0.08,
              bottom: s * 0.18,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'bids':
    case 'document':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.72,
              height: s * 0.86,
              borderRadius: 2.5,
              borderWidth: stroke,
              borderColor: color,
              paddingHorizontal: s * 0.12,
              justifyContent: 'center',
              gap: s * 0.11,
            }}
          >
            <View style={{ height: stroke * 0.85, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ height: stroke * 0.85, backgroundColor: color, borderRadius: 1 }} />
            <View style={{ height: stroke * 0.85, width: '65%', backgroundColor: color, borderRadius: 1 }} />
          </View>
        </View>
      );

    case 'auctions':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          {/* Downward live auction price trend arrow */}
          <View
            style={{
              width: s * 0.78,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '35deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.12,
              bottom: s * 0.18,
              width: s * 0.34,
              height: s * 0.34,
              borderRightWidth: stroke,
              borderBottomWidth: stroke,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'more':
      return (
        <View style={[styles.box, { width: s, height: s, flexDirection: 'row', gap: s * 0.14 }]}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: s * 0.19,
                height: s * 0.19,
                borderRadius: s * 0.1,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      );

    case 'portal':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.82,
              borderRadius: s * 0.41,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: s * 0.82,
                height: stroke * 0.85,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: s * 0.38,
                height: s * 0.82,
                borderRadius: s * 0.2,
                borderWidth: stroke * 0.85,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'contract':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.78,
              height: s * 0.78,
              borderRadius: s * 0.39,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.34,
                height: s * 0.18,
                borderLeftWidth: stroke,
                borderBottomWidth: stroke,
                borderColor: color,
                transform: [{ rotate: '-45deg' }, { translateY: -s * 0.04 }],
              }}
            />
          </View>
        </View>
      );

    case 'bell':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.56,
              height: s * 0.58,
              borderTopLeftRadius: s * 0.28,
              borderTopRightRadius: s * 0.28,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: s * 0.74,
              height: stroke,
              backgroundColor: color,
              borderRadius: 1,
              marginTop: -stroke * 0.4,
            }}
          />
          <View
            style={{
              width: s * 0.18,
              height: s * 0.12,
              borderBottomLeftRadius: s * 0.09,
              borderBottomRightRadius: s * 0.09,
              backgroundColor: color,
              marginTop: 1.5,
            }}
          />
        </View>
      );

    case 'buyer':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          {/* Government building / pillar outline */}
          <View
            style={{
              width: s * 0.78,
              height: stroke,
              backgroundColor: color,
              borderRadius: 1,
              marginBottom: s * 0.08,
            }}
          />
          <View style={{ flexDirection: 'row', gap: s * 0.16 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: stroke,
                  height: s * 0.42,
                  backgroundColor: color,
                  borderRadius: 1,
                }}
              />
            ))}
          </View>
          <View
            style={{
              width: s * 0.84,
              height: stroke,
              backgroundColor: color,
              borderRadius: 1,
              marginTop: s * 0.08,
            }}
          />
        </View>
      );

    case 'seller':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          {/* Verified shield outline */}
          <View
            style={{
              width: s * 0.7,
              height: s * 0.8,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
              borderBottomLeftRadius: s * 0.35,
              borderBottomRightRadius: s * 0.35,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.28,
                height: s * 0.15,
                borderLeftWidth: stroke,
                borderBottomWidth: stroke,
                borderColor: color,
                transform: [{ rotate: '-45deg' }, { translateY: -s * 0.03 }],
              }}
            />
          </View>
        </View>
      );

    case 'help':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.82,
              borderRadius: s * 0.41,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.24,
                height: s * 0.24,
                borderTopWidth: stroke,
                borderRightWidth: stroke,
                borderTopRightRadius: s * 0.12,
                borderColor: color,
                marginBottom: 2,
              }}
            />
            <View
              style={{
                width: stroke * 1.1,
                height: stroke * 1.1,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'theme':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.74,
              height: s * 0.74,
              borderRadius: s * 0.37,
              borderWidth: stroke,
              borderColor: color,
              overflow: 'hidden',
              flexDirection: 'row',
            }}
          >
            <View style={{ flex: 1, backgroundColor: color }} />
            <View style={{ flex: 1 }} />
          </View>
        </View>
      );

    case 'textSize':
      return (
        <View style={[styles.box, { width: s, height: s, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }]}>
          <View style={{ width: stroke, height: s * 0.46, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: stroke, height: s * 0.66, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: stroke, height: s * 0.84, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'radar':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.84,
              height: s * 0.84,
              borderRadius: s * 0.42,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: s * 0.46,
                height: s * 0.46,
                borderRadius: s * 0.23,
                borderWidth: stroke * 0.85,
                borderColor: color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: s * 0.16,
                  height: s * 0.16,
                  borderRadius: s * 0.08,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        </View>
      );

    case 'bookmark':
    case 'bookmarkFilled': {
      const filled = name === 'bookmarkFilled';
      const bw = Math.round(s * 0.62);
      const bh = Math.round(s * 0.8);
      if (filled) {
        const notchH = Math.max(3, Math.round(bh * 0.34));
        const bodyH = bh - notchH;
        const halfW = bw / 2;
        return (
          <View style={[styles.box, { width: s, height: s }]}>
            <View style={{ width: bw, height: bh, alignItems: 'center' }}>
              <View
                style={{
                  width: bw,
                  height: bodyH + 0.5,
                  borderTopLeftRadius: 2.5,
                  borderTopRightRadius: 2.5,
                  backgroundColor: color,
                }}
              />
              <View style={{ flexDirection: 'row', width: bw, height: notchH, marginTop: -0.5 }}>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderTopWidth: notchH,
                    borderTopColor: color,
                    borderRightWidth: halfW,
                    borderRightColor: 'transparent',
                  }}
                />
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderTopWidth: notchH,
                    borderTopColor: color,
                    borderLeftWidth: halfW,
                    borderLeftColor: 'transparent',
                  }}
                />
              </View>
            </View>
          </View>
        );
      }
      const innerW = Math.max(4, bw - stroke * 2);
      const diagSide = innerW * 0.74;
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: bw,
              height: bh,
              borderTopLeftRadius: 2.5,
              borderTopRightRadius: 2.5,
              borderTopWidth: stroke,
              borderLeftWidth: stroke,
              borderRightWidth: stroke,
              borderColor: color,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            <View
              style={{
                width: diagSide,
                height: diagSide,
                borderTopWidth: stroke,
                borderLeftWidth: stroke,
                borderColor: color,
                transform: [{ translateY: diagSide * 0.5 }, { rotate: '45deg' }],
              }}
            />
          </View>
        </View>
      );
    }

    case 'calendar':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.78,
              height: s * 0.74,
              borderRadius: 2.5,
              borderWidth: stroke,
              borderColor: color,
              overflow: 'hidden',
            }}
          >
            <View style={{ height: s * 0.22, backgroundColor: color }} />
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View
                style={{
                  width: s * 0.18,
                  height: s * 0.18,
                  borderRadius: 1.5,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        </View>
      );

    case 'profile':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.82,
              height: s * 0.82,
              borderRadius: s * 0.41,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'flex-end',
              overflow: 'hidden',
              paddingTop: s * 0.1,
            }}
          >
            <View
              style={{
                width: s * 0.28,
                height: s * 0.28,
                borderRadius: s * 0.14,
                borderWidth: stroke * 0.9,
                borderColor: color,
                marginBottom: s * 0.06,
              }}
            />
            <View
              style={{
                width: s * 0.56,
                height: s * 0.28,
                borderTopLeftRadius: s * 0.28,
                borderTopRightRadius: s * 0.28,
                borderWidth: stroke * 0.9,
                borderBottomWidth: 0,
                borderColor: color,
                marginBottom: -stroke * 0.5,
              }}
            />
          </View>
        </View>
      );

    case 'calculator':
      return (
        <View style={[styles.box, { width: s, height: s }]}>
          <View
            style={{
              width: s * 0.72,
              height: s * 0.86,
              borderRadius: 2.5,
              borderWidth: stroke,
              borderColor: color,
              padding: s * 0.1,
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                height: s * 0.18,
                borderRadius: 1.2,
                backgroundColor: color,
              }}
            />
            <View style={{ gap: s * 0.09 }}>
              {[0, 1].map((row) => (
                <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {[0, 1, 2].map((col) => (
                    <View
                      key={col}
                      style={{
                        width: Math.max(2, s * 0.11),
                        height: Math.max(2, s * 0.11),
                        borderRadius: 1,
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      );

    default:
      return null;
  }
});

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
