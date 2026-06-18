import AtmospherePanel from "./_components/AtmospherePanel";
import LoginForm from "./_components/LoginForm";

export default function LoginPage() {
  return (
    <div className="login-shell">
      <AtmospherePanel />
      <main className="login-main">
        <LoginForm />
      </main>
    </div>
  );
}
