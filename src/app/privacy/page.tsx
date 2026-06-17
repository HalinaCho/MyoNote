export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#edf7f6] px-4 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
        <h1 className="text-xl font-bold text-gray-900">개인정보 처리방침</h1>
        <p className="text-xs text-gray-400">최종 수정일: 2026년 6월 17일</p>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">1. 수집하는 개인정보 항목</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            마이오노트는 카카오 로그인을 통해 다음 정보를 수집합니다.
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>카카오 계정 고유 식별자(ID)</li>
            <li>이메일 주소(선택 제공 시)</li>
            <li>닉네임(선택 제공 시)</li>
          </ul>
          <p className="text-sm text-gray-600 leading-relaxed">
            서비스 이용 과정에서 사용자가 직접 입력하는 자녀 정보(생년월일, 안과 검사 기록,
            케어 기록 등)를 수집합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">2. 개인정보의 수집 및 이용 목적</h2>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>회원 인증 및 서비스 제공</li>
            <li>자녀 근시 케어 기록 저장 및 분석</li>
            <li>병원 예약 알림 등 서비스 기능 제공</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">3. 개인정보의 보유 및 이용 기간</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다. 단, 관련 법령에 따라
            보존이 필요한 경우 해당 기간 동안 보관합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">4. 개인정보의 제3자 제공</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            마이오노트는 사용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단,
            서비스 운영을 위해 아래 업체에 처리를 위탁합니다.
          </p>
          <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
            <li>Supabase Inc. — 데이터베이스 및 인증 서비스</li>
            <li>Kakao Corp. — 소셜 로그인</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">5. 정보주체의 권리</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            사용자는 언제든지 서비스 내 설정에서 계정 및 데이터 삭제를 요청할 수 있습니다.
            문의사항은 아래 이메일로 연락 바랍니다.
          </p>
          <p className="text-sm text-[#10bcad] font-medium">jhl8397@gmail.com</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">6. 개인정보 보호책임자</h2>
          <p className="text-sm text-gray-600">담당자: 마이오노트 운영팀</p>
          <p className="text-sm text-[#10bcad] font-medium">jhl8397@gmail.com</p>
        </section>
      </div>
    </div>
  )
}
