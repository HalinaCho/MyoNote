export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#edf7f6] px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">개인정보 처리방침</h1>
        <p className="text-xs text-gray-400">최종 수정일: 2026년 6월 20일</p>

        <p className="text-sm text-gray-600 leading-relaxed">
          마이오노트(이하 &quot;서비스&quot;)는 자녀의 근시 케어 기록을 보호자가 관리하는 서비스로,
          서비스 이용 과정에서 자녀의 안과 검사 기록 등 <b className="text-gray-800">건강정보(민감정보)</b>를
          처리합니다. 본 방침은 해당 정보가 어떻게 수집·이용·보관·파기되는지 안내합니다.
        </p>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">1. 수집하는 개인정보 항목</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            <b className="text-gray-700">(1) 회원 정보</b> — 카카오 로그인을 통해 다음 정보를 수집합니다.
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>카카오 계정 고유 식별자(ID)</li>
            <li>이메일 주소(선택 제공 시)</li>
            <li>닉네임(선택 제공 시)</li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed">
            <b className="text-gray-700">(2) 자녀 케어 정보</b> — 보호자가 직접 입력하는 다음 정보를 수집합니다.
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>자녀의 이름(또는 별칭), 생년월일, 성별</li>
            <li><b className="text-gray-700">안과 검사 기록(안축장·굴절도수 등) — 민감정보(건강정보)</b></li>
            <li>근시 케어 기록(아트로핀·드림렌즈 등 수행 여부), 생활습관 기록(야외활동·전자기기·수면 시간)</li>
            <li>병원 예약일 등 사용자가 입력한 정보</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>회원 인증 및 서비스 제공</li>
            <li>자녀 근시 케어 기록 저장 및 분석(변화 추이 차트 등)</li>
            <li>병원 예약 알림 등 서비스 기능 제공</li>
            <li>보호자 간 자녀 정보 공유(초대받은 보호자에 한함)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">3. 민감정보(건강정보)의 처리</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            서비스는 자녀의 안과 검사 기록 등 건강에 관한 정보를 처리합니다. 이는 「개인정보 보호법」
            제23조에 따른 민감정보로, <b className="text-gray-700">보호자(정보주체의 법정대리인)의 동의에 근거하여
            근시 케어 기록·분석 목적으로만 처리</b>되며 다른 목적으로 이용하지 않습니다.
            보호자는 동의를 거부할 수 있으나, 이 경우 검사 기록 저장·분석 기능을 이용할 수 없습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">4. 아동의 개인정보</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            서비스는 자녀(아동)가 직접 가입하지 않으며, <b className="text-gray-700">법정대리인인 보호자가
            자녀의 정보를 입력·관리</b>합니다. 보호자는 본인이 정당한 법정대리인임을 전제로 자녀 정보를
            등록하며, 등록된 자녀 정보의 열람·수정·삭제를 언제든지 직접 수행할 수 있습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">5. 개인정보의 보유 및 이용 기간</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            회원 탈퇴 또는 데이터 삭제 시 운영 데이터베이스에서 즉시 파기합니다. 다만 서비스 운영을 위한
            <b className="text-gray-700"> 백업본에 포함된 정보는 백업 보관 주기(최대 7일) 경과 후 자동 파기</b>됩니다.
            관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 분리하여 보관합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">6. 개인정보 처리의 위탁</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            마이오노트는 사용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단,
            서비스 운영을 위해 아래 업체에 처리를 위탁합니다.
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Supabase Inc. — 데이터베이스 호스팅, 인증, 백업(데이터는 암호화되어 저장)</li>
            <li>Kakao Corp. — 소셜 로그인</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">7. 정보주체의 권리와 행사 방법</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            사용자는 언제든지 자신과 자녀의 개인정보를 열람·수정할 수 있으며,
            <b className="text-gray-700"> 서비스 내 [설정 &gt; 계정 &gt; 회원 탈퇴]에서 계정과 데이터를 직접 삭제</b>할
            수 있습니다. 자녀·검사 기록 등 개별 데이터도 각 화면에서 직접 삭제할 수 있습니다.
            기타 문의는 아래 이메일로 연락 바랍니다.
          </p>
          <p className="text-sm text-teal-500 font-medium">jhl8397@gmail.com</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">8. 개인정보의 안전성 확보조치</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            서비스는 행 수준 보안(RLS) 및 접근제어를 통해 본인 및 초대받은 보호자만 자녀 정보에
            접근하도록 제한하며, 데이터는 전송 구간 암호화 및 저장 시 암호화를 적용합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">9. 개인정보 보호책임자</h2>
          <p className="text-sm text-gray-600">담당자: 마이오노트 운영팀</p>
          <p className="text-sm text-teal-500 font-medium">jhl8397@gmail.com</p>
        </section>
      </div>
    </div>
  )
}
