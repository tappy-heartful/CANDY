"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";

export default function Home() {
  const { userData } = useAuth();

  return (
    <AuthGuard>
      <div className="container">
        <main style={{ textAlign: 'center', marginTop: '50px' }}>
          <h1 style={{ fontSize: '48px', color: '#9B7CC3' }}>🍬 Welcome to CANDY</h1>
          <p style={{ fontSize: '20px', color: '#333' }}>
            Hello, <span style={{ color: '#F7A8C4', fontWeight: 'bold' }}>{userData?.displayName}</span>!
          </p>
          <div style={{ marginTop: '30px' }}>
            <img
              src={userData?.pictureUrl}
              alt="Profile"
              style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #A0E7D2' }}
            />
          </div>
          <p style={{ marginTop: '20px', color: '#666' }}>
            ログインに成功しました。これからアプリを作成していきましょう！
          </p>
        </main>
      </div>
    </AuthGuard>
  );
}
