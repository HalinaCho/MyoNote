-- ─────────────────────────────────────────────────────────────
-- 회원 탈퇴(계정 삭제) RPC — 2026-06-20
-- 개인정보처리방침 5조(정보주체의 권리: 데이터 삭제) 이행용.
--
-- 호출자 auth.uid() 의 모든 데이터를 안전하게 제거하고 인증 계정까지 삭제한다.
-- 자녀별 처리 규칙:
--   · 단독 소유자          → 자녀 + 모든 하위데이터 삭제(child_id FK cascade)
--   · 소유자(다른 보호자 有) → 가장 먼저 등록된 다른 보호자에게 소유권 양도 후 본인만 제거
--   · 편집자/열람자          → 본인 보호자행만 제거(자녀 데이터는 다른 보호자가 계속 사용)
--
-- 함수 전체가 하나의 트랜잭션이므로, auth.users 삭제 단계에서 권한 오류가 나면
-- 앞선 삭제가 전부 롤백된다(데이터 유실 없는 안전한 실패).
-- ─────────────────────────────────────────────────────────────

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_child_id  uuid;
  v_role      text;
  v_new_owner uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  for v_child_id, v_role in
    select child_id, role
    from eyebody_child_guardians
    where user_id = v_uid
  loop
    if v_role = 'owner' then
      -- 다른 보호자 중 가장 먼저 등록된 사람 1명
      select user_id into v_new_owner
      from eyebody_child_guardians
      where child_id = v_child_id and user_id <> v_uid
      order by created_at asc
      limit 1;

      if v_new_owner is not null then
        -- 소유권 양도 후 본인 보호자행만 제거(자녀 데이터 보존)
        update eyebody_child_guardians
          set role = 'owner'
          where child_id = v_child_id and user_id = v_new_owner;
        delete from eyebody_child_guardians
          where child_id = v_child_id and user_id = v_uid;
      else
        -- 단독 소유자 → 자녀 + 하위 데이터(검사기록/케어/생활습관/초대코드) 전체 삭제
        delete from eyebody_children where id = v_child_id;
      end if;
    else
      -- 편집자/열람자 → 본인만 빠짐
      delete from eyebody_child_guardians
        where child_id = v_child_id and user_id = v_uid;
    end if;
  end loop;

  -- 초대코드 정리 (eyebody_invite_codes 의 owner_id/used_by 가 프로필을 참조하므로 먼저 처리)
  --   · 내가 생성한 코드  → 삭제
  --   · 내가 수락한 코드  → 사용자 참조(used_by)만 해제 (다른 소유자의 기록은 유지)
  delete from eyebody_invite_codes where owner_id = v_uid;
  update eyebody_invite_codes set used_by = null where used_by = v_uid;

  -- 프로필 제거
  delete from eyebody_profiles where id = v_uid;

  -- 인증 계정 제거 (postgres 소유 SECURITY DEFINER 함수에서만 허용)
  delete from auth.users where id = v_uid;
end;
$$;

revoke all     on function public.delete_account() from public;
grant  execute on function public.delete_account() to authenticated;
