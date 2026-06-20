# Supabase Pro 전환 + 백업 절차 안내

> 대상: 마이오노트 운영자(jhl8397). 작성 2026-06-20.
> 이 문서는 **대시보드에서 직접 수행**하는 운영 작업 안내입니다(코드 변경 없음).
> 마이오노트는 **아동 건강정보(민감정보)** 를 다루므로 백업·가용성 확보가 중요합니다.

---

## 1. 왜 Pro로 올려야 하나 (판단 근거)

| 항목 | Free | Pro |
|---|---|---|
| **자동 백업** | ❌ 없음 | ✅ **매일 자동 백업(7일 보관)** |
| **프로젝트 자동 일시정지** | ⚠️ **7일 미사용 시 정지**(앱 다운) | ✅ 정지 없음 |
| Point-in-Time Recovery(PITR) | ❌ | ✅ (유료 add-on) |
| DB 용량 / 월 활성사용자 | 작음(무료 한도) | 넉넉(8GB DB / 10만 MAU 수준) |
| 지원 | 커뮤니티 | 이메일 지원 |
| 비용 | $0 | **약 $25/월** (+사용량) |

**핵심 이유 2가지**
1. **자동 백업이 Free엔 아예 없음** — 실수로 데이터가 날아가면 복구 수단이 없습니다.
2. **Free는 7일 미사용 시 프로젝트가 정지** — 실사용자가 적은 초기엔 며칠 안 들어오면 앱이 멈춥니다. 오픈하려면 사실상 Pro 필수.

> 💡 정확한 최신 가격·한도는 변동될 수 있으니 결제 화면에서 한 번 더 확인하세요.

---

## 2. Pro 전환 절차

> Supabase는 **요금제가 "조직(Organization)" 단위**입니다. 프로젝트가 아니라 조직을 업그레이드합니다.

1. https://supabase.com/dashboard 접속 → 마이오노트 프로젝트 진입
2. 좌측 하단 **조직명 클릭** 또는 상단에서 조직 선택 → **Settings → Billing**
   - (또는 직접: Dashboard 우상단 조직 → **Billing**)
3. **Plan** 섹션에서 **Upgrade to Pro** 클릭
4. 결제 수단(카드) 등록 → 업그레이드 확정
5. 업그레이드 후, 해당 조직 안의 **마이오노트 프로젝트가 Pro 혜택 적용**되는지 확인
   - Project → **Settings → General**에서 플랜 표시 확인
   - Project → **Database → Backups** 메뉴가 활성화되면 OK

> ⚠️ 조직에 프로젝트가 여러 개면 Pro 비용은 조직 기준이고 프로젝트별 compute가 추가됩니다. 마이오노트만 있으면 신경 안 써도 됩니다.

---

## 3. 자동 백업 확인 (Pro 전환 후)

1. Project → **Database → Backups**
2. **Daily backups**(매일 자동, 7일 보관) 목록이 보이면 정상
   - 별도 설정 불필요 — Pro면 자동 활성
3. 각 백업 행에서 **Restore**(복구) 가능
   - ⚠️ 복구는 **프로젝트 전체를 그 시점으로 되돌림**(이후 데이터 손실). 신중히.

### (선택) PITR — 더 촘촘한 복구가 필요하면
- **Point-in-Time Recovery**: 특정 "분/초" 단위 시점으로 복구. 유료 add-on(매월 추가 비용, 보관 기간에 비례).
- 지금 단계(소규모)에선 **매일 백업으로 충분**. 사용자·데이터가 늘면 그때 검토.
- 켜는 곳: Database → Backups → **Point in Time** 탭 → add-on 활성.

---

## 4. 수동 백업 (off-site 사본 — 강력 권장)

자동 백업은 **Supabase 안에만** 있습니다. 계정 문제·결제 누락·실수 삭제 같은 상황 대비로 **내 PC에 주기적 사본**을 받아두면 안전합니다.

### 준비: 연결 문자열 확인
- Project → **Settings → Database → Connection string** → **URI** 복사
  - 형식: `postgresql://postgres.[ref]:[PASSWORD]@...pooler.supabase.com:5432/postgres`
  - 비밀번호를 잊었으면 같은 화면에서 **Reset database password**

### 방법 A) Supabase CLI (가장 간편, 권장)
```bash
# 1) CLI 설치 (Windows, 한 번만)
#    scoop 사용 시:  scoop install supabase
#    또는 npm:        npm i -g supabase

# 2) 스키마+데이터 통째로 덤프
supabase db dump --db-url "위에서 복사한 URI" -f myonote-backup-2026-06-20.sql

# 데이터만:   --data-only
# 스키마만:   --schema-only (RLS/RPC 정의 백업용으로 유용)
```

### 방법 B) pg_dump 직접 (PostgreSQL 클라이언트 설치된 경우)
```bash
pg_dump "위에서 복사한 URI" -Fc -f myonote-backup-2026-06-20.dump
# -Fc = 커스텀 압축 포맷(복구 시 pg_restore 사용)
```

> 📌 권장 주기: **오픈 전엔 수동으로 가끔**, 오픈 후엔 **월 1회 정도** 사본을 받아 안전한 곳에 보관.
> 📌 백업 파일에는 **아동 건강정보**가 들어있습니다 — 암호화된/접근통제된 위치에 보관하고, 불필요해지면 파기하세요.

---

## 5. 복구(restore) 절차 요약

| 상황 | 방법 |
|---|---|
| 최근 며칠 내 사고 | 대시보드 **Database → Backups → Restore** (해당 날짜 선택) |
| 특정 시점 정밀 복구 | PITR add-on 활성 시 시점 지정 복구 |
| Supabase 밖 사본에서 | 새/기존 프로젝트에 `psql`/`pg_restore`로 덤프 적용 |

```bash
# CLI 덤프(.sql) 복구 예
psql "대상 URI" -f myonote-backup-2026-06-20.sql
# pg_dump 커스텀(.dump) 복구 예
pg_restore -d "대상 URI" --clean myonote-backup-2026-06-20.dump
```

---

## 6. 개인정보 관점 주의 (백업 ↔ 파기)

- 회원 탈퇴(`delete_account`)로 **운영 DB에선 즉시 삭제**되지만, **백업에는 백업 보관기간(7일) 동안 잔존**합니다.
  - 이는 일반적·합법적이지만, 개인정보처리방침의 "보유·파기" 문구와 일치하도록 **"백업본은 최대 N일 후 파기"** 취지를 명시하면 더 안전합니다. (다음 작업 "방침 보강"에서 반영 권장)
- 백업 파일을 외부에 보관할 경우, 그 보관 장소도 개인정보 처리 위탁/관리 대상이 됩니다.

---

## 7. 체크리스트

- [ ] 조직 Billing에서 **Pro 업그레이드** (카드 등록)
- [ ] 프로젝트 플랜 Pro 적용 확인 (Settings → General)
- [ ] **Database → Backups**에 매일 백업 표시 확인
- [ ] 연결 문자열 확보 + DB 비밀번호 보관
- [ ] **수동 백업 1회** 받아 안전한 곳에 저장 (off-site 사본 확보)
- [ ] (선택) PITR 필요성 검토 — 지금은 보류 가능
- [ ] (연계) 개인정보처리방침에 백업 보관·파기 문구 보강
