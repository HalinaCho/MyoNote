import ClinicShell from '@/components/layout/ClinicShell'

export default function ClinicLayout({ children }: { children: React.ReactNode }) {
  return <ClinicShell>{children}</ClinicShell>
}
