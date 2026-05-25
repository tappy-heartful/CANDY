import AuthGuard from "@/src/components/AuthGuard";
import UserEditClient from "@/src/features/user/views/UserEditClient";

export default function UserEditPage() {
  return (
    <AuthGuard>
      <UserEditClient />
    </AuthGuard>
  );
}
