import AuthPage from "./AuthPage";
import Login from "./Login";
import Register from "./Register";
import { useT } from "./i18n";

export function LocalizedLoginRoute() {
  const t = useT();

  return (
    <AuthPage title={`UniRide | ${t("auth.loginTitle")}`}>
      <Login />
    </AuthPage>
  );
}

export function LocalizedRegisterRoute() {
  const t = useT();

  return (
    <AuthPage title={`UniRide | ${t("auth.registerTitle")}`}>
      <Register />
    </AuthPage>
  );
}
