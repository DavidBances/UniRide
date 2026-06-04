import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearStoredToken, getStoredToken, onAuthTokenChanged } from '../authToken';
import { useLanguage, useT } from "../i18n";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState(() => getStoredToken());
  const { language, toggleLanguage } = useLanguage();
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const closeMenu = () => setIsOpen(false);
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-bold transition ${
      isActive
        ? "bg-teal-50 text-teal-800"
        : "text-gray-700 hover:bg-gray-50 hover:text-teal-700"
    }`;

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => onAuthTokenChanged(() => setToken(getStoredToken())), []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleLogout = () => {
    clearStoredToken();
    setToken("");
    setIsOpen(false);
    navigate("/login");
  };

  const isAuthenticated = Boolean(token);

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-teal-700" onClick={closeMenu}>
              {t("appName")}
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <NavLink to="/rides" className={navLinkClass}>{t("nav.findRide")}</NavLink>
            <NavLink to="/create-ride" className={navLinkClass}>{t("nav.publishRide")}</NavLink>
            <NavLink to="/profile" className={navLinkClass}>{t("nav.profile")}</NavLink>
            {!isAuthenticated && <NavLink to="/register" className={navLinkClass}>{t("nav.register")}</NavLink>}
            <button className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-teal-700" type="button" onClick={toggleLanguage}>
              {language === "es" ? "EN" : "ES"}
            </button>
            {isAuthenticated ? (
              <button className="btn btn-primary" type="button" onClick={handleLogout}>
                {t("nav.logout")}
              </button>
            ) : (
              <NavLink to="/login" className="btn btn-primary">{t("nav.login")}</NavLink>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button
              aria-controls="mobile-navigation"
              aria-expanded={isOpen}
              aria-label={isOpen ? t("nav.closeMenu") : t("nav.openMenu")}
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-md p-2 text-gray-700 hover:bg-gray-50 hover:text-teal-700"
              type="button"
            >
              <svg className="h-6 w-6" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div id="mobile-navigation" className="border-t border-gray-100 bg-white md:hidden">
          <div className="flex flex-col gap-1 px-3 py-3">
            <NavLink to="/rides" className={navLinkClass} onClick={closeMenu}>{t("nav.findRide")}</NavLink>
            <NavLink to="/create-ride" className={navLinkClass} onClick={closeMenu}>{t("nav.publishRide")}</NavLink>
            <NavLink to="/profile" className={navLinkClass} onClick={closeMenu}>{t("nav.profile")}</NavLink>
            {!isAuthenticated && <NavLink to="/register" className={navLinkClass} onClick={closeMenu}>{t("nav.register")}</NavLink>}
            <button className="rounded-md border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-teal-700 text-left" type="button" onClick={toggleLanguage}>
              {language === "es" ? "EN" : "ES"}
            </button>
            {isAuthenticated ? (
              <button className="btn btn-primary mt-2 text-center" type="button" onClick={handleLogout}>
                {t("nav.logout")}
              </button>
            ) : (
              <NavLink to="/login" className="btn btn-primary mt-2 text-center" onClick={closeMenu}>{t("nav.login")}</NavLink>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
