import { useT } from "../i18n";

export default function Footer() {
  const t = useT();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {t("appName")}. {t("footer")}
        </p>
      </div>
    </footer>
  );
}