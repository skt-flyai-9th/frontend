/**
 * PermissionsInfoScreen — 프로토타입 `12_권한안내.png`.
 *
 * ⚠️ 이 화면은 **설명만** 합니다. 실제 권한 요청은 하지 않습니다.
 *
 * 기능명세: "권한을 한 번에 묶어 요청하지 않는다."
 * 실제 요청은 각 기능을 처음 쓸 때 그 자리에서 합니다
 * (카메라 → CameraScreen, 갤러리 저장 → Publish).
 * 여기서 미리 다 요청하면 명세 위반이고, 사장님 입장에서도
 * "왜 갑자기 다 달라고 하지" 하는 화면이 됩니다. (인수인계 §6.7)
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, Mic, Image as ImageIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../../ui/Screen';
import { AppBar } from '../../../ui/AppBar';
import { Card } from '../../../ui/Card';
import { Banner } from '../../../ui/Feedback';
import { color, space, radius, text } from '../../../design/theme';

const PERMS = [
  {
    Icon: Camera,
    name: '카메라',
    why: '숏폼을 촬영할 때 씁니다.',
    when: '촬영 화면에 처음 들어갈 때 물어봅니다.',
  },
  {
    Icon: Mic,
    name: '마이크',
    why: '영상에 소리를 담을 때 씁니다.',
    when: '촬영 화면에 처음 들어갈 때 물어봅니다.',
  },
  {
    Icon: ImageIcon,
    name: '사진 보관함',
    why: '완성된 영상을 사장님 갤러리에 저장할 때 씁니다.',
    when: '완성본을 저장할 때 물어봅니다.',
  },
];

export default function PermissionsInfoScreen() {
  const nav = useNavigation();

  return (
    <Screen>
      <AppBar onBack={() => nav.goBack()} title="앱 권한 안내" />

      <Text style={[text.bodySmall, { color: color.ink[500] }]}>
        Reals가 쓰는 권한은 아래 세 가지뿐입니다. 지금 허용하실 필요는 없어요 —
        각 기능을 처음 쓸 때 그때그때 물어봅니다.
      </Text>

      {PERMS.map((p) => (
        <Card key={p.name}>
          <View style={styles.row}>
            {/* 가이드라인 §5.5: 아이콘은 brand-tint 배경의 둥근 사각형 안에 */}
            <View style={styles.iconBox}>
              <p.Icon size={20} strokeWidth={2} color={color.brand[600]} />
            </View>
            <View style={{ flex: 1, gap: space[1] }}>
              <Text style={text.subheading}>{p.name}</Text>
              <Text style={text.body}>{p.why}</Text>
              <Text style={[text.caption, { color: color.ink[400] }]}>{p.when}</Text>
            </View>
          </View>
        </Card>
      ))}

      <Banner
        tone="info"
        title="거절해도 괜찮습니다"
        description="권한을 거절해도 앱은 계속 쓸 수 있어요. 해당 기능을 쓸 때 휴대폰 설정에서 다시 켜는 방법을 알려드립니다."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space[3], alignItems: 'flex-start' },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: color.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
