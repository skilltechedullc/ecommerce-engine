// Root admin layout — minimal shell, no auth check here.
// Auth + sidebar are enforced in app/admin/(protected)/layout.tsx
// This shell exists so app/admin/login/page.tsx doesn't inherit the sidebar.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
